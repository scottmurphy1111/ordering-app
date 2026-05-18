import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { getOrderLocalStripe, getPlanPriceId } from '$lib/server/stripe-billing';
import { TIERS } from '$lib/billing';
import type { BillingInterval } from '$lib/billing';
import type Stripe from 'stripe';

const PAID_TIERS = new Set(['market', 'pro']);

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/login');
	const vendorId = locals.vendorId;
	if (!vendorId) redirect(302, '/vendors');

	const setupIntentClientSecret = url.searchParams.get('setupIntentClientSecret');
	const setupIntentId = url.searchParams.get('setupIntentId');
	const planKey = url.searchParams.get('planKey');
	const intervalRaw = url.searchParams.get('interval');

	if (!setupIntentClientSecret || !setupIntentId || !planKey || !intervalRaw) {
		redirect(302, '/dashboard/account/billing');
	}
	if (!PAID_TIERS.has(planKey)) {
		redirect(302, '/dashboard/account/billing');
	}
	const interval: BillingInterval = intervalRaw === 'annual' ? 'annual' : 'monthly';

	// Verify the SetupIntent exists and is still pending. If it's already been
	// confirmed (vendor returned to a stale URL) or expired, bounce to billing.
	const stripe = getOrderLocalStripe();
	let setupIntent: Stripe.SetupIntent;
	try {
		setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
	} catch {
		redirect(302, '/dashboard/account/billing');
	}
	if (
		setupIntent.status !== 'requires_payment_method' &&
		setupIntent.status !== 'requires_confirmation'
	) {
		redirect(302, '/dashboard/account/billing');
	}

	const tier = TIERS.find((t) => t.key === planKey) ?? TIERS[1];
	const monthlyPrice = 'price' in tier ? (tier.price as number) : 0;
	const annualMonthly = 'annualMonthly' in tier ? (tier.annualMonthly as number) : 0;
	const annualTotal = 'annualTotal' in tier ? (tier.annualTotal as number) : 0;

	const displayPrice =
		interval === 'annual'
			? { monthly: annualMonthly, billed: annualTotal, period: 'year' as const }
			: { monthly: monthlyPrice, billed: monthlyPrice, period: 'month' as const };

	// Amount due today: full first cycle. No proration on new subscriptions —
	// vendor pays a full month or full year starting today.
	const amountDueTodayCents = (interval === 'annual' ? annualTotal : monthlyPrice) * 100;
	const fullCycleAmountCents = amountDueTodayCents;

	// Approximate next charge date — subscription doesn't exist yet, so compute
	// from today. The actual date is confirmed in the billing page after creation.
	const now = new Date();
	const approxNext = new Date(now);
	if (interval === 'annual') approxNext.setFullYear(now.getFullYear() + 1);
	else approxNext.setMonth(now.getMonth() + 1);
	const nextChargeDate = approxNext.toISOString();

	const publishableKey = env.ORDERLOCAL_STRIPE_PUBLISHABLE_KEY ?? env.STRIPE_PUBLISHABLE_KEY ?? '';

	return {
		clientSecret: setupIntentClientSecret,
		setupIntentId,
		publishableKey,
		planKey,
		planName: tier.name,
		interval,
		displayPrice,
		features: [...tier.features],
		amountDueTodayCents,
		fullCycleAmountCents,
		nextChargeDate
	};
};

export const actions: Actions = {
	finalizeSubscription: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated.' });
		const vendorId = locals.vendorId;
		if (!vendorId) return fail(403, { error: 'No vendor in session.' });

		const formData = await request.formData();
		const setupIntentId = formData.get('setupIntentId')?.toString();
		const planKey = formData.get('planKey')?.toString();
		const intervalRaw = formData.get('interval')?.toString();

		if (!setupIntentId || !planKey || !intervalRaw) {
			return fail(400, { error: 'Missing checkout details.' });
		}
		if (!PAID_TIERS.has(planKey)) {
			return fail(400, { error: 'Invalid plan.' });
		}
		const interval: BillingInterval = intervalRaw === 'annual' ? 'annual' : 'monthly';

		const priceId = getPlanPriceId(planKey, interval);
		if (!priceId) {
			return fail(500, { error: 'Plan price not configured. Please contact support.' });
		}

		const stripe = getOrderLocalStripe();

		// 1. Confirm the SetupIntent succeeded and pull the payment method off it.
		let setupIntent: Stripe.SetupIntent;
		try {
			setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
		} catch (err) {
			console.error('[finalizeSubscription] SetupIntent retrieve failed:', err);
			return fail(500, { error: 'Could not verify your payment. Please try again.' });
		}

		if (setupIntent.status !== 'succeeded') {
			return fail(400, {
				error: 'Payment method was not confirmed. Please re-enter your card details.'
			});
		}

		const pmRef = setupIntent.payment_method;
		const paymentMethodId = typeof pmRef === 'string' ? pmRef : pmRef?.id;
		if (!paymentMethodId) {
			return fail(500, { error: 'Payment method missing on confirmed SetupIntent.' });
		}

		// Verify the SetupIntent belongs to this vendor (metadata sanity check).
		if (setupIntent.metadata?.vendorId !== String(vendorId)) {
			return fail(403, { error: 'Checkout session does not belong to your account.' });
		}

		// 2. Load the vendor record. Refuse if a live paid subscription already exists
		// (double-submit or race protection).
		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				name: true,
				email: true,
				stripeCustomerId: true,
				stripeSubscriptionId: true,
				subscriptionTier: true
			}
		});
		if (!record) return fail(404, { error: 'Vendor not found.' });
		if (record.stripeSubscriptionId) {
			return fail(409, { error: 'A subscription is already in progress on this account.' });
		}

		// 3. Create the Stripe customer — deferred until vendor actually completed
		// checkout, so no orphan customer records exist on abandon.
		let customerId = record.stripeCustomerId ?? null;
		if (!customerId) {
			try {
				const customer = await stripe.customers.create({
					name: record.name ?? undefined,
					email: record.email ?? undefined,
					metadata: { vendorId: String(vendorId) }
				});
				customerId = customer.id;
			} catch (err) {
				console.error('[finalizeSubscription] customer create failed:', err);
				return fail(500, { error: 'Could not create your billing account. Please try again.' });
			}
		}

		// 4. Attach the payment method and set as customer default BEFORE creating
		// the subscription so the first invoice auto-charges against it.
		try {
			await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (!message.includes('already')) {
				console.error('[finalizeSubscription] payment method attach failed:', err);
				return fail(500, { error: 'Could not save your payment method. Please try again.' });
			}
		}

		try {
			await stripe.customers.update(customerId, {
				invoice_settings: { default_payment_method: paymentMethodId }
			});
		} catch (err) {
			console.error('[finalizeSubscription] set default PM failed:', err);
			return fail(500, { error: 'Could not save your payment method. Please try again.' });
		}

		// 5. Create the subscription. With a customer-level default PM in place,
		// Stripe immediately generates the first invoice and auto-charges it.
		// No payment_behavior: 'default_incomplete' — subscription starts active.
		let subscription: Stripe.Subscription;
		try {
			subscription = await stripe.subscriptions.create(
				{
					customer: customerId,
					items: [{ price: priceId }],
					default_payment_method: paymentMethodId,
					metadata: { vendorId: String(vendorId), planKey, interval }
				},
				{ idempotencyKey: `sub-create:${vendorId}:${planKey}:${interval}` }
			);
		} catch (err) {
			console.error('[finalizeSubscription] subscription create failed:', err);
			// Customer + PM exist. Persist customerId so the card is saved for next
			// retry, but do NOT flip the tier. Vendor can retry from billing.
			try {
				await db
					.update(vendor)
					.set({ stripeCustomerId: customerId, updatedAt: new Date() })
					.where(eq(vendor.id, vendorId));
			} catch (dbErr) {
				console.error('[finalizeSubscription] partial DB save failed:', dbErr);
			}
			return fail(500, {
				error:
					'Your card was saved but the subscription could not be started. Please contact support or try again.'
			});
		}

		// 6. Commit everything synchronously. The webhook will also fire and
		// re-confirm these values — idempotent.
		await db
			.update(vendor)
			.set({
				stripeCustomerId: customerId,
				stripeSubscriptionId: subscription.id,
				subscriptionTier: planKey,
				subscriptionStatus: subscription.status,
				subscriptionEndsAt: null,
				subscriptionRefundedAt: null,
				updatedAt: new Date()
			})
			.where(eq(vendor.id, vendorId));

		redirect(303, '/dashboard/account/billing?upgraded=1');
	}
};
