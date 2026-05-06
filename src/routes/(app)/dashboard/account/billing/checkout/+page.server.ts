import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { getOrderLocalStripe } from '$lib/server/stripe-billing';
import { TIERS, nextBillingAnchor } from '$lib/billing';
import type Stripe from 'stripe';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/login');
	const vendorId = locals.vendorId;
	if (!vendorId) redirect(302, '/vendors');

	const subscriptionId = url.searchParams.get('subscriptionId');
	if (!subscriptionId) redirect(302, '/dashboard/account/billing');

	const vendorRecord = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: { stripeSubscriptionId: true }
	});

	// Guard: the subscriptionId must belong to this vendor
	if (vendorRecord?.stripeSubscriptionId !== subscriptionId) {
		redirect(302, '/dashboard/account/billing');
	}

	const stripe = getOrderLocalStripe();
	const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
		expand: ['latest_invoice']
	});

	// Stripe v22: client secret lives on invoice.confirmation_secret.client_secret
	const invoice = subscription.latest_invoice as Stripe.Invoice | null;
	const clientSecret = invoice?.confirmation_secret?.client_secret ?? null;

	if (!clientSecret) {
		// Subscription already active or no payment needed
		redirect(302, '/dashboard/account/billing?upgraded=1');
	}

	const planKey = subscription.metadata?.planKey ?? 'market';
	const interval = (subscription.metadata?.interval ?? 'monthly') as 'monthly' | 'annual';
	const tier = TIERS.find((t) => t.key === planKey) ?? TIERS[1];

	const monthlyPrice = 'price' in tier ? (tier.price as number) : 0;
	const annualMonthly = 'annualMonthly' in tier ? (tier.annualMonthly as number) : 0;
	const annualTotal = 'annualTotal' in tier ? (tier.annualTotal as number) : 0;

	const displayPrice =
		interval === 'annual'
			? { monthly: annualMonthly, billed: annualTotal, period: 'year' }
			: { monthly: monthlyPrice, billed: monthlyPrice, period: 'month' };

	// Bridge billing fields.
	// bridgeAmountCents — the prorated charge due today (the bridge invoice).
	// fullCycleAmountCents — what Stripe will charge on each full cycle going forward.
	// nextChargeDate — subscription.current_period_end, which equals the anchor date
	//   (15th) for a bridge signup, or the end of the first full cycle for a same-day signup.
	// isBridgeFree — true when the vendor signed up on the 15th (no bridge needed).
	const bridgeAmountCents = invoice?.amount_due ?? 0;
	const fullCycleAmountCents = interval === 'annual' ? annualTotal * 100 : monthlyPrice * 100;
	// In Stripe SDK v22+, current_period_end moved from Subscription to SubscriptionItem.
	// For a bridge signup, period_end = the anchor (next 15th). For a same-day signup,
	// period_end = the end of the first full cycle (following 15th or annual equivalent).
	const periodEnd = subscription.items.data[0]?.current_period_end;
	const nextChargeDate = new Date(
		(periodEnd ?? subscription.billing_cycle_anchor) * 1000
	).toISOString();
	const anchorForToday = nextBillingAnchor();
	const today = new Date();
	// Bridge-free when today is already an anchor day (the 15th).
	// Compare calendar dates, not timestamps — anchor's time is end-of-day local.
	const isBridgeFree =
		anchorForToday.getFullYear() === today.getFullYear() &&
		anchorForToday.getMonth() === today.getMonth() &&
		anchorForToday.getDate() === today.getDate();

	const publishableKey = env.ORDERLOCAL_STRIPE_PUBLISHABLE_KEY ?? env.STRIPE_PUBLISHABLE_KEY ?? '';

	return {
		clientSecret,
		publishableKey,
		planKey,
		planName: tier.name,
		interval,
		displayPrice,
		features: [...tier.features],
		bridgeAmountCents,
		fullCycleAmountCents,
		nextChargeDate,
		isBridgeFree
	};
};
