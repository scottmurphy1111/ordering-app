import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, desc, or, not, inArray, gte, isNotNull, sql } from 'drizzle-orm';
import { orders } from '$lib/server/db/schema';
import { vendor } from '$lib/server/db/vendor';
import Stripe from 'stripe';
import { sendEmail } from '$lib/server/email';
import { orderReadyEmail } from '$lib/server/email/templates/orderReady';
import { orderCancelledEmail } from '$lib/server/email/templates/orderCancelled';
import { orderRefundedEmail } from '$lib/server/email/templates/orderRefunded';

const HISTORY_CUTOFF_MS = 24 * 60 * 60 * 1000;

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('app:orders');
	const vendorId = locals.vendorId!;
	const statusFilter = url.searchParams.get('status') ?? '';

	const cutoff = new Date(Date.now() - HISTORY_CUTOFF_MS);
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);

	const whereConditions = [
		eq(orders.vendorId, vendorId),
		or(not(inArray(orders.status, ['fulfilled', 'cancelled'])), gte(orders.updatedAt, cutoff))!
	];
	if (statusFilter) {
		whereConditions.push(eq(orders.status, statusFilter as typeof orders.status._.data));
	}

	const baseConditions = [
		eq(orders.vendorId, vendorId),
		or(not(inArray(orders.status, ['fulfilled', 'cancelled'])), gte(orders.updatedAt, cutoff))!
	];

	const [allOrders, countRows, scheduledRow, todayRevenueRow] = await Promise.all([
		db.query.orders.findMany({
			where: and(...whereConditions),
			orderBy: [desc(orders.createdAt)],
			limit: 50,
			columns: {
				id: true,
				orderNumber: true,
				customerName: true,
				customerPhone: true,
				total: true,
				status: true,
				paymentStatus: true,
				type: true,
				createdAt: true,
				notes: true,
				scheduledFor: true,
				deliveryAddress: true,
				stripePaymentIntentId: true
			},
			with: {
				items: {
					columns: { name: true, quantity: true }
				}
			}
		}),
		db.query.orders.findMany({
			where: and(...baseConditions),
			columns: { status: true }
		}),
		db
			.select({ count: sql<number>`count(*)` })
			.from(orders)
			.where(
				and(
					eq(orders.vendorId, vendorId),
					isNotNull(orders.scheduledFor),
					or(
						not(inArray(orders.status, ['fulfilled', 'cancelled'])),
						gte(orders.updatedAt, cutoff)
					)!
				)
			),
		db
			.select({ total: sql<number>`coalesce(sum(total), 0)` })
			.from(orders)
			.where(and(eq(orders.vendorId, vendorId), gte(orders.createdAt, todayStart)))
	]);

	const statusCounts = countRows.reduce<Record<string, number>>((acc, o) => {
		acc[o.status] = (acc[o.status] ?? 0) + 1;
		return acc;
	}, {});

	return {
		orders: allOrders,
		statusFilter,
		statusCounts,
		scheduledCount: Number(scheduledRow[0]?.count ?? 0),
		todayRevenue: Number(todayRevenueRow[0]?.total ?? 0)
	};
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const status = formData.get('status')?.toString();
		if (isNaN(id) || !status) return fail(400, { error: 'Invalid' });

		const [order] = await db
			.update(orders)
			.set({ status: status as typeof orders.status._.data, updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)))
			.returning();

		if (status === 'ready' && order?.customerEmail) {
			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true }
			});
			if (vendorRecord) {
				await sendEmail({
					to: order.customerEmail,
					subject: `Your order is ready — ${vendorRecord.name}`,
					html: orderReadyEmail({
						tenantName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						total: order.total,
						orderType: order.type
					})
				}).catch(console.error);
			}
		}

		return { success: true };
	},

	cancel: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const [order] = await db
			.update(orders)
			.set({ status: 'cancelled', updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)))
			.returning();

		if (order?.customerEmail) {
			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true }
			});
			if (vendorRecord) {
				await sendEmail({
					to: order.customerEmail,
					subject: `Order ${order.orderNumber} cancelled — ${vendorRecord.name}`,
					html: orderCancelledEmail({
						tenantName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						total: order.total
					})
				}).catch(console.error);
			}
		}

		return { success: true };
	},

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
