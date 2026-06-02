import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { orders, orderItems } from '$lib/server/db/orders';
import { specialOrderPayments } from '$lib/server/db/special-orders';
import { vendor } from '$lib/server/db/vendor';
import Stripe from 'stripe';
import { sendEmail } from '$lib/server/email';
import { alternateDeclinedEmail } from '$lib/server/email/templates/alternateDeclined';
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

	// Special-order installment rows (deposit/balance), if any — drives the
	// "Deposit paid · Balance due" summary.
	const payments = await db
		.select()
		.from(specialOrderPayments)
		.where(eq(specialOrderPayments.orderId, orderId))
		.orderBy(specialOrderPayments.id);

	return { order, items, payments };
};

export const actions: Actions = {
	recoverPayment: async ({ request, locals }) => {
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
			// We deliberately do NOT pass `payment_method` here. The vendor's Stripe account
			// has automatic_payment_methods enabled via its payment_method_configuration, which
			// causes Stripe to ignore any payment_method parameter at PI creation. The saved PM
			// is surfaced to the customer via a Customer Session created in the checkout page
			// load — see (public)/checkout/+page.server.ts.
			const pi = await stripe.paymentIntents.create(
				{
					amount: order.total,
					currency: 'usd',
					customer: order.stripeCustomerId,
					setup_future_usage: 'off_session',
					...(order.customerEmail ? { receipt_email: order.customerEmail } : {}),
					metadata: {
						orderId: String(order.id),
						vendorSlug: vendorRecord.slug,
						orderNumber: order.orderNumber
					}
				},
				{ idempotencyKey: `pi-create:${vendorId}:${order.id}:retry` }
			);

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

		throw redirect(303, `/checkout?orderId=${id}`);
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
		if (order.status !== 'pending_approval')
			return fail(400, { error: 'Order is not pending approval' });
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
		if (orderRow.status !== 'pending_approval')
			return fail(400, { error: 'Order is not pending approval' });
		if (orderRow.proposedAt === null) return fail(400, { error: 'No proposal to decline' });

		const [cancelled] = await db
			.update(orders)
			.set({
				status: 'cancelled',
				paymentStatus: 'void',
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
				columns: {
					name: true,
					email: true,
					backgroundColor: true,
					subscriptionTier: true,
					addons: true
				}
			});
			if (vendorRecord) {
				if (cancelled.customerEmail) {
					await sendEmail({
						to: cancelled.customerEmail,
						subject: `Order ${cancelled.orderNumber} cancelled — couldn't find a pickup date`,
						html: alternateDeclinedEmail({
							vendorName: vendorRecord.name,
							primaryColor: vendorRecord.backgroundColor ?? undefined,
							vendorSubscriptionTier: vendorRecord.subscriptionTier ?? undefined,
							orderNumber: cancelled.orderNumber,
							customerName: cancelled.customerName ?? 'there',
							total: cancelled.total
						}),
						fromName: vendorRecord.name,
						replyTo: vendorRecord.email ?? undefined,
						category: 'alternate_declined'
					}).catch(console.error);
				}
				if (cancelled.customerPhone) {
					await sendSms(
						cancelled.customerPhone,
						`${vendorRecord.name}: Your order ${cancelled.orderNumber} has been cancelled.`,
						{
							subscriptionTier: vendorRecord.subscriptionTier ?? undefined,
							addons: vendorRecord.addons
						}
					).catch(console.error);
				}
			}
		}

		return { declineSuccess: true };
	}
};
