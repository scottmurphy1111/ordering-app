import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { orders } from '$lib/server/db/schema';
import { tenant } from '$lib/server/db/tenant';
import Stripe from 'stripe';
import { sendEmail } from '$lib/server/email';
import { orderReadyEmail } from '$lib/server/email/templates/orderReady';
import { orderCancelledEmail } from '$lib/server/email/templates/orderCancelled';
import { orderRefundedEmail } from '$lib/server/email/templates/orderRefunded';

export const load: PageServerLoad = async ({ locals, url }) => {
	const tenantId = locals.tenantId!;
	const statusFilter = url.searchParams.get('status') ?? '';

	const whereConditions = [eq(orders.tenantId, tenantId)];
	if (statusFilter) {
		whereConditions.push(eq(orders.status, statusFilter as typeof orders.status._.data));
	}

	const allOrders = await db.query.orders.findMany({
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
			stripePaymentIntentId: true
		}
	});

	return { orders: allOrders, statusFilter };
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const status = formData.get('status')?.toString();
		if (isNaN(id) || !status) return fail(400, { error: 'Invalid' });

		const [order] = await db
			.update(orders)
			.set({ status: status as typeof orders.status._.data, updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
			.returning();

		if (status === 'ready' && order?.customerEmail) {
			const tenantRecord = await db.query.tenant.findFirst({
				where: eq(tenant.id, tenantId),
				columns: { name: true, primaryColor: true }
			});
			if (tenantRecord) {
				await sendEmail({
					to: order.customerEmail,
					subject: `Your order is ready — ${tenantRecord.name}`,
					html: orderReadyEmail({
						tenantName: tenantRecord.name,
						primaryColor: tenantRecord.primaryColor ?? undefined,
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
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const [order] = await db
			.update(orders)
			.set({ status: 'cancelled', updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
			.returning();

		if (order?.customerEmail) {
			const tenantRecord = await db.query.tenant.findFirst({
				where: eq(tenant.id, tenantId),
				columns: { name: true, primaryColor: true }
			});
			if (tenantRecord) {
				await sendEmail({
					to: order.customerEmail,
					subject: `Order ${order.orderNumber} cancelled — ${tenantRecord.name}`,
					html: orderCancelledEmail({
						tenantName: tenantRecord.name,
						primaryColor: tenantRecord.primaryColor ?? undefined,
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
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const [orderRow, tenantRecord] = await Promise.all([
			db.query.orders.findFirst({
				where: and(eq(orders.id, id), eq(orders.tenantId, tenantId))
			}),
			db.query.tenant.findFirst({
				where: eq(tenant.id, tenantId),
				columns: { stripeSecretKey: true, name: true, primaryColor: true }
			})
		]);

		if (!orderRow) return fail(404, { error: 'Order not found' });
		if (orderRow.status !== 'cancelled') return fail(400, { error: 'Order must be cancelled before refunding' });
		if (orderRow.paymentStatus !== 'paid') return fail(400, { error: 'Order has not been paid' });
		if (!orderRow.stripePaymentIntentId) return fail(400, { error: 'No payment found for this order' });
		if (!tenantRecord?.stripeSecretKey) return fail(500, { error: 'Stripe not configured for this tenant' });

		const stripe = new Stripe(tenantRecord.stripeSecretKey);

		let paymentIntentId = orderRow.stripePaymentIntentId;
		if (paymentIntentId.startsWith('cs_')) {
			try {
				const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
				if (!session.payment_intent) return fail(400, { error: 'No payment intent found on this session' });
				paymentIntentId = typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent.id;
			} catch (e: unknown) {
				return fail(502, { error: e instanceof Error ? e.message : 'Could not resolve Stripe session' });
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

		if (refundedOrder?.customerEmail && tenantRecord) {
			await sendEmail({
				to: refundedOrder.customerEmail,
				subject: `Refund processed for order ${refundedOrder.orderNumber} — ${tenantRecord.name}`,
				html: orderRefundedEmail({
					tenantName: tenantRecord.name,
					primaryColor: tenantRecord.primaryColor ?? undefined,
					orderNumber: refundedOrder.orderNumber,
					customerName: refundedOrder.customerName ?? 'there',
					total: refundedOrder.total
				})
			}).catch(console.error);
		}

		return { success: true };
	}
};
