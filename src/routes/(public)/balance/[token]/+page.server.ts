import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { specialOrderPayments } from '$lib/server/db/special-orders';
import { orders } from '$lib/server/db/schema';
import { vendor as vendorTable } from '$lib/server/db/vendor';

export const load: PageServerLoad = async ({ params, locals }) => {
	const vendorCtx = locals.vendor!;
	const { token } = params;

	const payment = await db.query.specialOrderPayments.findFirst({
		where: and(
			eq(specialOrderPayments.payToken, token),
			eq(specialOrderPayments.vendorId, vendorCtx.id)
		)
	});

	if (!payment) {
		return { vendor: vendorCtx, payment: null, order: null };
	}

	const order = payment.orderId
		? await db.query.orders.findFirst({
				where: eq(orders.id, payment.orderId),
				columns: { id: true, orderNumber: true, total: true, scheduledFor: true, status: true }
			})
		: null;

	return { vendor: vendorCtx, payment, order };
};

export const actions: Actions = {
	pay: async ({ params, locals }) => {
		const vendorCtx = locals.vendor!;
		const vendorId = locals.vendorId!;
		const { token } = params;

		const payment = await db.query.specialOrderPayments.findFirst({
			where: and(
				eq(specialOrderPayments.payToken, token),
				eq(specialOrderPayments.vendorId, vendorId)
			)
		});

		if (!payment) return fail(404, { payError: 'Payment link not found.' });
		if (payment.label !== 'Balance')
			return fail(400, { payError: 'This link is not a balance payment.' });
		if (payment.status === 'paid')
			return fail(400, { payError: 'This balance has already been paid.' });
		if (payment.status === 'void')
			return fail(400, { payError: 'This balance is no longer payable.' });
		if (payment.status !== 'scheduled')
			return fail(400, { payError: 'This balance is not available to pay.' });
		if (payment.orderId == null) return fail(400, { payError: 'This payment has no order.' });

		const order = await db.query.orders.findFirst({
			where: and(eq(orders.id, payment.orderId), eq(orders.vendorId, vendorId)),
			columns: { id: true, orderNumber: true, customerEmail: true, stripeCustomerId: true }
		});
		if (!order) return fail(404, { payError: 'Order not found.' });

		// Resolve the vendor's Stripe secret the same way the accept flow does.
		const vendorRow = await db.query.vendor.findFirst({
			where: eq(vendorTable.id, vendorId),
			columns: { stripeSecretKey: true }
		});
		if (!vendorRow?.stripeSecretKey) {
			return fail(500, { payError: 'Payment is not configured for this shop.' });
		}

		const stripe = new Stripe(vendorRow.stripeSecretKey);

		const pi = await stripe.paymentIntents.create(
			{
				amount: payment.amountCents,
				currency: 'usd',
				...(order.stripeCustomerId ? { customer: order.stripeCustomerId } : {}),
				setup_future_usage: 'off_session',
				...(order.customerEmail ? { receipt_email: order.customerEmail } : {}),
				metadata: {
					orderId: String(order.id),
					vendorSlug: vendorCtx.slug,
					orderNumber: order.orderNumber,
					paymentPhase: 'balance',
					specialOrderPaymentId: String(payment.id)
				}
			},
			{ idempotencyKey: `pi-create:${vendorId}:balance:${token}` }
		);

		await db
			.update(specialOrderPayments)
			.set({ stripePaymentIntentId: pi.id })
			.where(eq(specialOrderPayments.id, payment.id));

		// The order's stripePaymentIntentId tracks the currently-active PI.
		await db
			.update(orders)
			.set({ stripePaymentIntentId: pi.id, updatedAt: new Date() })
			.where(eq(orders.id, order.id));

		throw redirect(303, `/checkout?orderId=${order.id}`);
	}
};
