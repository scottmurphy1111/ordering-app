import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, count } from 'drizzle-orm';
import { tenant } from '$lib/server/db/tenant';
import { menuItems } from '$lib/server/db/schema';
import { ADDONS, type AddonItem, type BillingInterval } from '$lib/billing';
import { requireStaff } from '$lib/server/roles';
import { getOrderLocalStripe, getPlanPriceId, getAddonPriceId } from '$lib/server/stripe-billing';

const VALID_ADDON_KEYS = new Set<string>(ADDONS.map((a) => a.key));
const PAID_TIERS = new Set(['pro']);

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	const tenantId = locals.tenantId!;

	const [countResult, tenantRecord] = await Promise.all([
		db.select({ count: count() }).from(menuItems).where(eq(menuItems.tenantId, tenantId)),
		db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: {
				subscriptionTier: true,
				subscriptionStatus: true,
				stripeCustomerId: true,
				stripeSubscriptionId: true,
				addons: true
			}
		})
	]);

	let nextBillingDate: string | null = null;
	let periodStart: string | null = null;
	let billingInterval: BillingInterval = 'monthly';

	if (tenantRecord?.stripeSubscriptionId) {
		try {
			const stripe = getOrderLocalStripe();
			const [subscription, preview] = await Promise.all([
				stripe.subscriptions.retrieve(tenantRecord.stripeSubscriptionId, { expand: ['items'] }),
				stripe.invoices.createPreview({ subscription: tenantRecord.stripeSubscriptionId })
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
		subscriptionTier: tenantRecord?.subscriptionTier ?? 'starter',
		subscriptionStatus: tenantRecord?.subscriptionStatus ?? 'active',
		hasStripeSubscription: !!tenantRecord?.stripeSubscriptionId,
		hasStripeCustomer: !!tenantRecord?.stripeCustomerId,
		addons: (tenantRecord?.addons ?? []) as AddonItem[],
		nextBillingDate,
		periodStart,
		billingInterval
	};
};

export const actions: Actions = {
	upgrade: async ({ request, locals, url }) => {
		requireStaff(locals);
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const planKey = formData.get('planKey')?.toString();
		const intervalRaw = formData.get('interval')?.toString();
		const interval: BillingInterval =
			intervalRaw === 'annual' ? 'annual' : 'monthly';

		if (!planKey || !PAID_TIERS.has(planKey)) return fail(400, { error: 'Invalid plan' });

		const priceId = getPlanPriceId(planKey, interval);
		if (!priceId) return fail(500, { error: 'Plan price not configured. Contact support.' });

		const record = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
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

		// Upgrade existing subscription plan item rather than new checkout
		if (record?.stripeSubscriptionId) {
			const subscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId, {
				expand: ['items']
			});
			const planItem =
				subscription.items.data.find((i) => {
					const meta = i.price.metadata?.type;
					return meta === 'plan' || !meta; // plan items have type=plan or are the first item
				}) ?? subscription.items.data[0];

			if (planItem) {
				await stripe.subscriptionItems.update(planItem.id, { price: priceId });
				await db
					.update(tenant)
					.set({ subscriptionTier: planKey, updatedAt: new Date() })
					.where(eq(tenant.id, tenantId));
				return { success: true, upgraded: true };
			}
		}

		// No existing subscription — create via Checkout
		let customerId = record?.stripeCustomerId;
		if (!customerId) {
			const customer = await stripe.customers.create({
				name: record?.name ?? undefined,
				email: record?.email ?? undefined,
				metadata: { tenantId: String(tenantId) }
			});
			customerId = customer.id;
			await db.update(tenant).set({ stripeCustomerId: customerId }).where(eq(tenant.id, tenantId));
		}

		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			mode: 'subscription',
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${url.origin}/dashboard/settings/billing?upgraded=1`,
			cancel_url: `${url.origin}/dashboard/settings/billing`,
			metadata: { tenantId: String(tenantId), planKey, interval }
		});

		redirect(303, session.url!);
	},

	downgrade: async ({ request, locals }) => {
		requireStaff(locals);
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const planKey = formData.get('planKey')?.toString();

		if (planKey !== 'starter') return fail(400, { error: 'Invalid plan' });

		const record = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { stripeSubscriptionId: true, subscriptionTier: true }
		});

		if (record?.subscriptionTier === 'starter') return fail(400, { error: 'Already on Starter.' });

		const stripe = getOrderLocalStripe();

		if (record?.stripeSubscriptionId) {
			await stripe.subscriptions.cancel(record.stripeSubscriptionId);
		}
		await db
			.update(tenant)
			.set({
				subscriptionTier: 'starter',
				subscriptionStatus: 'cancelled',
				stripeSubscriptionId: null,
				addons: [],
				updatedAt: new Date()
			})
			.where(eq(tenant.id, tenantId));

		return { success: true, downgraded: true };
	},

	switchInterval: async ({ request, locals }) => {
		requireStaff(locals);
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const intervalRaw = formData.get('interval')?.toString();
		const interval: BillingInterval = intervalRaw === 'annual' ? 'annual' : 'monthly';

		const record = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { stripeSubscriptionId: true, subscriptionTier: true }
		});

		if (record?.subscriptionTier !== 'pro' || !record.stripeSubscriptionId)
			return fail(400, { error: 'No active Pro subscription.' });

		const priceId = getPlanPriceId('pro', interval);
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
		const tenantId = locals.tenantId!;

		const record = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { stripeCustomerId: true }
		});

		if (!record?.stripeCustomerId) return fail(400, { error: 'No billing account found.' });

		const stripe = getOrderLocalStripe();
		const session = await stripe.billingPortal.sessions.create({
			customer: record.stripeCustomerId,
			return_url: `${url.origin}/dashboard/settings/billing`
		});

		redirect(303, session.url);
	},

	activateAddon: async ({ request, locals }) => {
		requireStaff(locals);
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const key = formData.get('key')?.toString();
		const intervalRaw = formData.get('interval')?.toString();
		const interval: BillingInterval = intervalRaw === 'annual' ? 'annual' : 'monthly';

		if (!key || !VALID_ADDON_KEYS.has(key)) return fail(400, { error: 'Invalid add-on.' });

		const record = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { subscriptionTier: true, stripeSubscriptionId: true, addons: true }
		});

		if (!record?.subscriptionTier || !PAID_TIERS.has(record.subscriptionTier)) {
			return fail(400, { error: 'Upgrade your plan before activating add-ons.' });
		}

		if (!record.stripeSubscriptionId) {
			return fail(400, {
				error: 'No active Stripe subscription found. Complete your plan upgrade first.'
			});
		}

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
			.update(tenant)
			.set({ addons: [...current, { key, stripeItemId: item.id }], updatedAt: new Date() })
			.where(eq(tenant.id, tenantId));

		return { success: true };
	},

	deactivateAddon: async ({ request, locals }) => {
		requireStaff(locals);
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const key = formData.get('key')?.toString();

		if (!key || !VALID_ADDON_KEYS.has(key)) return fail(400, { error: 'Invalid add-on.' });

		const record = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
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
			// If the item doesn't exist in Stripe, still clean up the DB
			if (!(e instanceof Error && e.message.includes('No such subscription_item'))) {
				throw e;
			}
		}

		await db
			.update(tenant)
			.set({ addons: current.filter((a) => a.key !== key), updatedAt: new Date() })
			.where(eq(tenant.id, tenantId));

		return { success: true };
	}
};
