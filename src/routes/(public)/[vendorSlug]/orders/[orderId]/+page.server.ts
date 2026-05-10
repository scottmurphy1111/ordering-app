import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { orders, orderItems } from '$lib/server/db/orders';
import { vendor } from '$lib/server/db/vendor';
import Stripe from 'stripe';
import { sendEmail } from '$lib/server/email';
import { orderCancelledEmail } from '$lib/server/email/templates/orderCancelled';
import { reconcilePaymentStatus } from '$lib/server/orders/reconcilePaymentStatus';
import { sendSms } from '$lib/server/sms';

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	depends('app:order-status');
	const vendorId = locals.vendorId!;
	const orderId = parseInt(params.orderId);

	if (isNaN(orderId)) throw error(404, 'Order not found');

	let order = await db.query.orders.findFirst({
		where: and(eq(orders.id, orderId), eq(orders.vendorId, vendorId))
	});

	if (!order) throw error(404, 'Order not found');

	order = await reconcilePaymentStatus(order, vendorId);

	const items = await db.query.orderItems.findMany({
		where: eq(orderItems.orderId, orderId)
	});

	return { order, items, vendorSlug: params.vendorSlug };
};

export const actions: Actions = {
	recoverPayment: async ({ request, locals, params }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid order ID' });

		const order = await db.query.orders.findFirst({
			where: and(eq(orders.id, id), eq(orders.vendorId, vendorId))
		});
		if (!order) return fail(404, { error: 'Order not found' });
		if (order.status !== 'payment_failed')
			return fail(400, { error: 'Order is not in a failed payment state' });
		if (!order.stripeCustomerId)
			return fail(400, { error: 'Order is missing payment customer data' });

		const vendorRecord = locals.vendor;
		if (!vendorRecord?.stripeSecretKey)
			return fail(500, { error: 'Stripe not configured for this store' });

		const stripe = new Stripe(vendorRecord.stripeSecretKey);

		try {
			const pi = await stripe.paymentIntents.create({
				amount: order.total,
				currency: 'usd',
				customer: order.stripeCustomerId,
				...(order.stripePaymentMethodId ? { payment_method: order.stripePaymentMethodId } : {}),
				setup_future_usage: 'off_session',
				...(order.customerEmail ? { receipt_email: order.customerEmail } : {}),
				metadata: {
					orderId: String(order.id),
					vendorSlug: params.vendorSlug,
					orderNumber: order.orderNumber
				}
			});

			await db
				.update(orders)
				.set({
					stripePaymentIntentId: pi.id,
					stripeSetupIntentId: null,
					updatedAt: new Date()
				})
				.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)));
		} catch (e: unknown) {
			return fail(502, {
				error: e instanceof Error ? e.message : 'Could not create payment intent'
			});
		}

		throw redirect(303, `/${params.vendorSlug}/checkout?orderId=${id}`);
	},

	acceptAlternate: async ({ locals, request }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid order ID' });

		const order = await db.query.orders.findFirst({
			where: and(eq(orders.id, id), eq(orders.vendorId, vendorId))
		});
		if (!order) return fail(404, { error: 'Order not found' });
		if (order.status !== 'pending_approval') return fail(400, { error: 'Order is not pending approval' });
		if (order.proposedAt === null) return fail(400, { error: 'No proposal to accept' });
		if (!order.proposedDate) return fail(400, { error: 'Proposed date missing' });

		await db
			.update(orders)
			.set({
				scheduledFor: order.proposedDate,
				proposedDate: null,
				proposedReason: null,
				proposedAt: null,
				updatedAt: new Date()
			})
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)));

		return { acceptSuccess: true };
	},

	declineAlternate: async ({ locals, request }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid order ID' });

		const orderRow = await db.query.orders.findFirst({
			where: and(eq(orders.id, id), eq(orders.vendorId, vendorId))
		});
		if (!orderRow) return fail(404, { error: 'Order not found' });
		if (orderRow.status !== 'pending_approval') return fail(400, { error: 'Order is not pending approval' });
		if (orderRow.proposedAt === null) return fail(400, { error: 'No proposal to decline' });

		const [cancelled] = await db
			.update(orders)
			.set({
				status: 'cancelled',
				proposedDate: null,
				proposedReason: null,
				proposedAt: null,
				updatedAt: new Date()
			})
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)))
			.returning();

		if (cancelled?.customerEmail || cancelled?.customerPhone) {
			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true }
			});
			if (vendorRecord) {
				if (cancelled.customerEmail) {
					await sendEmail({
						to: cancelled.customerEmail,
						subject: `Order ${cancelled.orderNumber} cancelled — ${vendorRecord.name}`,
						html: orderCancelledEmail({
							tenantName: vendorRecord.name,
							primaryColor: vendorRecord.backgroundColor ?? undefined,
							orderNumber: cancelled.orderNumber,
							customerName: cancelled.customerName ?? 'there',
							total: cancelled.total
						})
					}).catch(console.error);
				}
				if (cancelled.customerPhone) {
					await sendSms(
						cancelled.customerPhone,
						`${vendorRecord.name}: Your order ${cancelled.orderNumber} has been cancelled.`
					).catch(console.error);
				}
			}
		}

		return { declineSuccess: true };
	}
};
