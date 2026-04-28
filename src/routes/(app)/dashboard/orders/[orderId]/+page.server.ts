import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { orders } from '$lib/server/db/schema';
import { vendor } from '$lib/server/db/vendor';
import Stripe from 'stripe';
import { sendEmail } from '$lib/server/email';
import { orderReadyEmail } from '$lib/server/email/templates/orderReady';
import { orderCancelledEmail } from '$lib/server/email/templates/orderCancelled';
import { orderRefundedEmail } from '$lib/server/email/templates/orderRefunded';
import { sendSms } from '$lib/server/sms';

export const load: PageServerLoad = async ({ locals, params }) => {
	const vendorId = locals.vendorId!;
	const orderId = parseInt(params.orderId);
	if (isNaN(orderId)) throw error(404, 'Order not found');

	const order = await db.query.orders.findFirst({
		where: and(eq(orders.id, orderId), eq(orders.vendorId, vendorId))
	});

	if (!order) throw error(404, 'Order not found');

	return { order };
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

		if (status === 'ready' && (order?.customerEmail || order?.customerPhone)) {
			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true, slug: true }
			});
			if (vendorRecord) {
				if (order.customerEmail) {
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
				if (order.customerPhone) {
					await sendSms(
						order.customerPhone,
						`${vendorRecord.name}: Your order ${order.orderNumber} is ready for pickup!`
					).catch(console.error);
				}
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

		if (order?.customerEmail || order?.customerPhone) {
			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true, slug: true }
			});
			if (vendorRecord) {
				if (order.customerEmail) {
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
				if (order.customerPhone) {
					await sendSms(
						order.customerPhone,
						`${vendorRecord.name}: Your order ${order.orderNumber} has been cancelled.`
					).catch(console.error);
				}
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
