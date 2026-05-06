import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { requireStaff } from '$lib/server/roles';
import { getOrderLocalStripe } from '$lib/server/stripe-billing';
import type Stripe from 'stripe';

function resolveId(pm: string | Stripe.PaymentMethod | null | undefined): string | null {
	if (!pm) return null;
	return typeof pm === 'string' ? pm : pm.id;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	const vendorId = locals.vendorId!;

	const vendorRecord = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: { stripeCustomerId: true, stripeSubscriptionId: true }
	});

	if (!vendorRecord?.stripeCustomerId) {
		return {
			paymentMethods: [],
			defaultPaymentMethodId: null,
			subscriptionDefaultPaymentMethodId: null,
			hasStripeCustomer: false
		};
	}

	const customerId = vendorRecord.stripeCustomerId;
	const stripe = getOrderLocalStripe();

	const [pmList, customer, subscription] = await Promise.all([
		stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
		stripe.customers.retrieve(customerId),
		vendorRecord.stripeSubscriptionId
			? stripe.subscriptions.retrieve(vendorRecord.stripeSubscriptionId)
			: null
	]);

	const defaultPaymentMethodId = customer.deleted
		? null
		: resolveId(customer.invoice_settings.default_payment_method);

	const subscriptionDefaultPaymentMethodId = subscription
		? resolveId(subscription.default_payment_method)
		: null;

	const paymentMethods = pmList.data.map((pm) => ({
		id: pm.id,
		brand: pm.card?.brand ?? 'unknown',
		last4: pm.card?.last4 ?? '****',
		expMonth: pm.card?.exp_month ?? 0,
		expYear: pm.card?.exp_year ?? 0
	}));

	return {
		paymentMethods,
		defaultPaymentMethodId,
		subscriptionDefaultPaymentMethodId,
		hasStripeCustomer: true
	};
};

export const actions: Actions = {
	setDefault: async ({ request, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const paymentMethodId = formData.get('paymentMethodId')?.toString();
		if (!paymentMethodId) return fail(400, { error: 'Missing payment method.' });

		const vendorRecord = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { stripeCustomerId: true, stripeSubscriptionId: true }
		});
		if (!vendorRecord?.stripeCustomerId) return fail(400, { error: 'No billing account found.' });

		const stripe = getOrderLocalStripe();
		await stripe.customers.update(vendorRecord.stripeCustomerId, {
			invoice_settings: { default_payment_method: paymentMethodId }
		});
		if (vendorRecord.stripeSubscriptionId) {
			await stripe.subscriptions.update(vendorRecord.stripeSubscriptionId, {
				default_payment_method: paymentMethodId
			});
		}
		return { success: true, defaultUpdated: true };
	},

	remove: async ({ request, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const paymentMethodId = formData.get('paymentMethodId')?.toString();
		if (!paymentMethodId) return fail(400, { error: 'Missing payment method.' });

		const vendorRecord = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { stripeCustomerId: true }
		});
		if (!vendorRecord?.stripeCustomerId) return fail(400, { error: 'No billing account found.' });

		const stripe = getOrderLocalStripe();
		const existing = await stripe.paymentMethods.list({
			customer: vendorRecord.stripeCustomerId,
			type: 'card'
		});
		if (existing.data.length <= 1) {
			return fail(400, {
				error: "Can't remove your only card. Add another first, then remove this one."
			});
		}

		try {
			await stripe.paymentMethods.detach(paymentMethodId);
		} catch (e: unknown) {
			return fail(400, { error: e instanceof Error ? e.message : 'Failed to remove card.' });
		}
		return { success: true, removed: true };
	}
};
