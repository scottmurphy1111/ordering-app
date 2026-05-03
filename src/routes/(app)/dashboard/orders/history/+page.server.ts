import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, or, desc, lt, gte, lte, ilike, sql } from 'drizzle-orm';
import { orders } from '$lib/server/db/schema';
import { vendor } from '$lib/server/db/vendor';
import Stripe from 'stripe';
import { sendEmail } from '$lib/server/email';
import { orderRefundedEmail } from '$lib/server/email/templates/orderRefunded';

const HISTORY_CUTOFF_MS = 24 * 60 * 60 * 1000;

export const load: PageServerLoad = async ({ locals, url }) => {
	const vendorId = locals.vendorId!;
	const search = url.searchParams.get('q') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const statusFilter = url.searchParams.get('status') ?? '';

	const cutoff = new Date(Date.now() - HISTORY_CUTOFF_MS);

	const whereConditions = [eq(orders.vendorId, vendorId), lt(orders.updatedAt, cutoff)];

	if (statusFilter === 'fulfilled' || statusFilter === 'cancelled') {
		whereConditions.push(eq(orders.status, statusFilter as typeof orders.status._.data));
	} else {
		whereConditions.push(or(eq(orders.status, 'fulfilled'), eq(orders.status, 'cancelled'))!);
	}

	if (search) {
		whereConditions.push(
			or(
				ilike(orders.orderNumber, `%${search}%`),
				ilike(orders.customerName, `%${search}%`),
				ilike(orders.customerEmail, `%${search}%`),
				ilike(orders.customerPhone, `%${search}%`)
			)!
		);
	}

	if (from) whereConditions.push(gte(orders.createdAt, new Date(from)));
	if (to) {
		const toDate = new Date(to);
		toDate.setUTCHours(23, 59, 59, 999);
		whereConditions.push(lte(orders.createdAt, toDate));
	}

	const [historyOrders, summaryRow] = await Promise.all([
		db.query.orders.findMany({
			where: and(...whereConditions),
			orderBy: [desc(orders.createdAt)],
			limit: 100,
			columns: {
				id: true,
				orderNumber: true,
				customerName: true,
				customerEmail: true,
				customerPhone: true,
				total: true,
				status: true,
				paymentStatus: true,
				type: true,
				createdAt: true,
				updatedAt: true,
				scheduledFor: true,
				deliveryAddress: true,
				stripePaymentIntentId: true
			},
			with: { items: { columns: { name: true, quantity: true } } }
		}),
		db
			.select({
				total: sql<number>`count(*)`,
				fulfilled: sql<number>`count(*) filter (where ${orders.status} = 'fulfilled')`,
				cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')`,
				revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} = 'fulfilled'), 0)`,
				refunded: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'refunded')`
			})
			.from(orders)
			.where(and(...whereConditions))
	]);

	const summary = summaryRow[0] ?? {
		total: 0,
		fulfilled: 0,
		cancelled: 0,
		revenue: 0,
		refunded: 0
	};

	return { orders: historyOrders, search, from, to, statusFilter, summary };
};

export const actions: Actions = {
	refund: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const [orderRow, vendorRecord] = await Promise.all([
			db.query.orders.findFirst({
				where: and(eq(orders.id, id), eq(orders.vendorId, vendorId))
			}),
			db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { stripeSecretKey: true, name: true, backgroundColor: true }
			})
		]);

		if (!orderRow) return fail(404, { error: 'Order not found' });
		if (orderRow.status !== 'cancelled')
			return fail(400, { error: 'Order must be cancelled before refunding' });
		if (orderRow.paymentStatus !== 'paid') return fail(400, { error: 'Order has not been paid' });
		if (!orderRow.stripePaymentIntentId)
			return fail(400, { error: 'No payment found for this order' });
		if (!vendorRecord?.stripeSecretKey)
			return fail(500, { error: 'Stripe not configured for this vendor' });

		const stripe = new Stripe(vendorRecord.stripeSecretKey);

		let paymentIntentId = orderRow.stripePaymentIntentId;
		if (paymentIntentId.startsWith('cs_')) {
			try {
				const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
				if (!session.payment_intent)
					return fail(400, { error: 'No payment intent found on this session' });
				paymentIntentId =
					typeof session.payment_intent === 'string'
						? session.payment_intent
						: session.payment_intent.id;
			} catch (e: unknown) {
				return fail(502, {
					error: e instanceof Error ? e.message : 'Could not resolve Stripe session'
				});
			}
		}

		try {
			await stripe.refunds.create({ payment_intent: paymentIntentId });
		} catch (e: unknown) {
			return fail(502, { error: e instanceof Error ? e.message : 'Stripe refund failed' });
		}

		const [refundedOrder] = await db
			.update(orders)
			.set({ paymentStatus: 'refunded', updatedAt: new Date() })
			.where(eq(orders.id, id))
			.returning();

		if (refundedOrder?.customerEmail && vendorRecord) {
			await sendEmail({
				to: refundedOrder.customerEmail,
				subject: `Refund processed for order ${refundedOrder.orderNumber} — ${vendorRecord.name}`,
				html: orderRefundedEmail({
					tenantName: vendorRecord.name,
					primaryColor: vendorRecord.backgroundColor ?? undefined,
					orderNumber: refundedOrder.orderNumber,
					customerName: refundedOrder.customerName ?? 'there',
					total: refundedOrder.total
				})
			}).catch(console.error);
		}

		return { success: true };
	}
};
