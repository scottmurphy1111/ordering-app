import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, count } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { catalogItems } from '$lib/server/db/schema';
import { ADDONS, type AddonItem, type BillingInterval } from '$lib/billing';
import { requireStaff } from '$lib/server/roles';
import { getOrderLocalStripe, getPlanPriceId, getAddonPriceId } from '$lib/server/stripe-billing';

const VALID_ADDON_KEYS = new Set<string>(ADDONS.map((a) => a.key));
const PAID_TIERS = new Set(['market', 'pro']);

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	const vendorId = locals.vendorId!;

	const [countResult, vendorRecord] = await Promise.all([
		db.select({ count: count() }).from(catalogItems).where(eq(catalogItems.vendorId, vendorId)),
		db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				subscriptionTier: true,
				subscriptionStatus: true,
				subscriptionEndsAt: true,
				stripeCustomerId: true,
				stripeSubscriptionId: true,
				addons: true
			}
		})
	]);

	let nextBillingDate: string | null = null;
	let periodStart: string | null = null;
	let billingInterval: BillingInterval = 'monthly';

	if (vendorRecord?.stripeSubscriptionId) {
		try {
			const stripe = getOrderLocalStripe();
			const [subscription, preview] = await Promise.all([
				stripe.subscriptions.retrieve(vendorRecord.stripeSubscriptionId, { expand: ['items'] }),
				stripe.invoices.createPreview({ subscription: vendorRecord.stripeSubscriptionId })
			]);
			const planItem =
				subscription.items.data.find((i) => {
					const meta = i.price.metadata?.type;
					return meta === 'plan' || !meta;
				}) ?? subscription.items.data[0];
			billingInterval = planItem?.price.recurring?.interval === 'year' ? 'annual' : 'monthly';
			periodStart = new Date(preview.period_start * 1000).toISOString();
			nextBillingDate = new Date(preview.period_end * 1000).toISOString();
		} catch {
			// Stripe preview unavailable — billing dates stay null
		}
	}

	return {
		itemCount: countResult[0]?.count ?? 0,
		subscriptionTier: vendorRecord?.subscriptionTier ?? 'starter',
		subscriptionStatus: vendorRecord?.subscriptionStatus ?? 'active',
		subscriptionEndsAt: vendorRecord?.subscriptionEndsAt
			? vendorRecord.subscriptionEndsAt.toISOString()
			: null,
		hasStripeSubscription: !!vendorRecord?.stripeSubscriptionId,
		hasStripeCustomer: !!vendorRecord?.stripeCustomerId,
		addons: (vendorRecord?.addons ?? []) as AddonItem[],
		nextBillingDate,
		periodStart,
		billingInterval
	};
};

export const actions: Actions = {
	upgrade: async ({ request, locals, url }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const planKey = formData.get('planKey')?.toString();
		const intervalRaw = formData.get('interval')?.toString();
		const interval: BillingInterval = intervalRaw === 'annual' ? 'annual' : 'monthly';

		if (!planKey || !PAID_TIERS.has(planKey)) return fail(400, { error: 'Invalid plan' });
		const priceId = getPlanPriceId(planKey, interval);
		if (!priceId) return fail(500, { error: 'Plan price not configured. Contact support.' });

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				stripeCustomerId: true,
				name: true,
				email: true,
				subscriptionTier: true,
				stripeSubscriptionId: true
			}
		});

		if (record?.subscriptionTier === planKey) return fail(400, { error: 'Already on this plan.' });
		const stripe = getOrderLocalStripe();

		if (record?.stripeSubscriptionId) {
			const subscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId, {
				expand: ['items']
			});
			const planItem =
				subscription.items.data.find((i) => {
					const meta = i.price.metadata?.type;
					return meta === 'plan' || !meta;
				}) ?? subscription.items.data[0];
			if (planItem) {
				await stripe.subscriptionItems.update(planItem.id, { price: priceId });
				await db
					.update(vendor)
					.set({ subscriptionTier: planKey, updatedAt: new Date() })
					.where(eq(vendor.id, vendorId));
				return { success: true, upgraded: true };
			}
		}

		let customerId = record?.stripeCustomerId;
		if (!customerId) {
			const customer = await stripe.customers.create({
				name: record?.name ?? undefined,
				email: record?.email ?? undefined,
				metadata: { vendorId: String(vendorId) }
			});
			customerId = customer.id;
			await db.update(vendor).set({ stripeCustomerId: customerId }).where(eq(vendor.id, vendorId));
		}

		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			mode: 'subscription',
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${url.origin}/dashboard/account/billing?upgraded=1`,
			cancel_url: `${url.origin}/dashboard/account/billing`,
			metadata: { vendorId: String(vendorId), planKey, interval }
		});
		redirect(303, session.url!);
	},

	downgrade: async ({ request, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const planKey = formData.get('planKey')?.toString();
		const intervalRaw = formData.get('interval')?.toString();
		const interval: BillingInterval = intervalRaw === 'annual' ? 'annual' : 'monthly';

		if (planKey !== 'starter' && !PAID_TIERS.has(planKey ?? ''))
			return fail(400, { error: 'Invalid plan' });

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { stripeSubscriptionId: true, subscriptionTier: true }
		});
		if (record?.subscriptionTier === planKey) return fail(400, { error: 'Already on this plan.' });

		const stripe = getOrderLocalStripe();

		// Path 1: Schedule cancellation at period end (any paid tier → Starter).
		// Vendor keeps paid features for the time they've already paid for.
		// Stripe fires customer.subscription.deleted at period end; webhook handles
		// the actual tier flip + addon clearing then.
		if (planKey === 'starter') {
			if (!record?.stripeSubscriptionId)
				return fail(400, { error: 'No active subscription to cancel.' });

			const subscription = await stripe.subscriptions.update(record.stripeSubscriptionId, {
				cancel_at_period_end: true
			});

			// Mirror the scheduled-end state to DB so UI renders correctly without
			// waiting for the webhook. Webhook will reconfirm.
			// cancel_at is always populated by Stripe when cancel_at_period_end is set.
			const endsAt = subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null;

			await db
				.update(vendor)
				.set({
					subscriptionEndsAt: endsAt,
					updatedAt: new Date()
				})
				.where(eq(vendor.id, vendorId));
			return { success: true, downgraded: true };
		}

		// Path 2: Tier-down between paid plans (e.g. Pro → Market).
		// Updates the Stripe subscription item; add-ons preserved (Market supports all).
		if (!record?.stripeSubscriptionId)
			return fail(400, { error: 'No active subscription to downgrade.' });

		const priceId = getPlanPriceId(planKey!, interval);
		if (!priceId) return fail(500, { error: 'Plan price not configured. Contact support.' });

		const subscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId, {
			expand: ['items']
		});
		const planItem =
			subscription.items.data.find((i) => {
				const meta = i.price.metadata?.type;
				return meta === 'plan' || !meta;
			}) ?? subscription.items.data[0];
		if (!planItem) return fail(500, { error: 'Could not find subscription item.' });

		await stripe.subscriptionItems.update(planItem.id, {
			price: priceId,
			proration_behavior: 'create_prorations'
		});
		await db
			.update(vendor)
			.set({ subscriptionTier: planKey, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		return { success: true, downgraded: true };
	},

	switchInterval: async ({ request, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const intervalRaw = formData.get('interval')?.toString();
		const interval: BillingInterval = intervalRaw === 'annual' ? 'annual' : 'monthly';

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { stripeSubscriptionId: true, subscriptionTier: true }
		});
		if (
			!record?.subscriptionTier ||
			!PAID_TIERS.has(record.subscriptionTier) ||
			!record.stripeSubscriptionId
		)
			return fail(400, { error: 'No active paid subscription.' });

		const priceId = getPlanPriceId(record.subscriptionTier, interval);
		if (!priceId) return fail(500, { error: 'Price not configured. Contact support.' });

		const stripe = getOrderLocalStripe();
		const subscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId, {
			expand: ['items']
		});
		const planItem =
			subscription.items.data.find((i) => {
				const meta = i.price.metadata?.type;
				return meta === 'plan' || !meta;
			}) ?? subscription.items.data[0];
		if (!planItem) return fail(500, { error: 'Could not find subscription item.' });
		await stripe.subscriptionItems.update(planItem.id, {
			price: priceId,
			proration_behavior: 'create_prorations'
		});
		return { success: true };
	},

	openPortal: async ({ locals, url }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { stripeCustomerId: true }
		});
		if (!record?.stripeCustomerId) return fail(400, { error: 'No billing account found.' });
		const stripe = getOrderLocalStripe();
		const session = await stripe.billingPortal.sessions.create({
			customer: record.stripeCustomerId,
			return_url: `${url.origin}/dashboard/account/billing`
		});
		redirect(303, session.url);
	},

	activateAddon: async ({ request, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const key = formData.get('key')?.toString();
		const intervalRaw = formData.get('interval')?.toString();
		const interval: BillingInterval = intervalRaw === 'annual' ? 'annual' : 'monthly';

		if (!key || !VALID_ADDON_KEYS.has(key)) return fail(400, { error: 'Invalid add-on.' });

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { subscriptionTier: true, stripeSubscriptionId: true, addons: true }
		});
		if (!record?.subscriptionTier || !PAID_TIERS.has(record.subscriptionTier))
			return fail(400, { error: 'Upgrade your plan before activating add-ons.' });
		if (!record.stripeSubscriptionId)
			return fail(400, {
				error: 'No active Stripe subscription found. Complete your plan upgrade first.'
			});

		const current = (record.addons ?? []) as AddonItem[];
		if (current.some((a) => a.key === key)) return { success: true };

		const priceId = getAddonPriceId(key, interval);
		if (!priceId) return fail(500, { error: 'Add-on price not configured. Contact support.' });

		const stripe = getOrderLocalStripe();
		const item = await stripe.subscriptionItems.create({
			subscription: record.stripeSubscriptionId,
			price: priceId
		});
		await db
			.update(vendor)
			.set({ addons: [...current, { key, stripeItemId: item.id }], updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		return { success: true };
	},

	deactivateAddon: async ({ request, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const key = formData.get('key')?.toString();
		if (!key || !VALID_ADDON_KEYS.has(key)) return fail(400, { error: 'Invalid add-on.' });

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { addons: true }
		});
		const current = (record?.addons ?? []) as AddonItem[];
		const addonEntry = current.find((a) => a.key === key);
		if (!addonEntry) return { success: true };

		const stripe = getOrderLocalStripe();
		try {
			await stripe.subscriptionItems.del(addonEntry.stripeItemId, {
				proration_behavior: 'create_prorations'
			});
		} catch (e: unknown) {
			if (!(e instanceof Error && e.message.includes('No such subscription_item'))) throw e;
		}
		await db
			.update(vendor)
			.set({ addons: current.filter((a) => a.key !== key), updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		return { success: true };
	}
};
