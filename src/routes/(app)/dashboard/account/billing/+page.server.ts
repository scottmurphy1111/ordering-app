import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, count } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { catalogItems } from '$lib/server/db/schema';
import {
	ADDONS,
	TIERS,
	type AddonItem,
	type BillingInterval,
	cancelImmediateRefundPreview,
	pauseUntilTimestamp
} from '$lib/billing';
import { sendEmail } from '$lib/server/email';
import { recordNotification } from '$lib/server/notifications';
import { pauseConfirmedEmail } from '$lib/server/email/templates/pauseConfirmed';
import { pauseResumedEmail } from '$lib/server/email/templates/pauseResumed';
import { subscriptionTierChangedEmail } from '$lib/server/email/templates/subscriptionTierChanged';
import { subscriptionIntervalChangedEmail } from '$lib/server/email/templates/subscriptionIntervalChanged';
import { subscriptionCancellationScheduledEmail } from '$lib/server/email/templates/subscriptionCancellationScheduled';
import { subscriptionCancellationImmediateEmail } from '$lib/server/email/templates/subscriptionCancellationImmediate';
import { subscriptionAddonChangedEmail } from '$lib/server/email/templates/subscriptionAddonChanged';
import { accountCreditRefundedEmail } from '$lib/server/email/templates/accountCreditRefunded';
import { subscriptionReactivatedEmail } from '$lib/server/email/templates/subscriptionReactivated';
import { requireStaff } from '$lib/server/roles';
import type Stripe from 'stripe';
import {
	getOrderLocalStripe,
	getPlanPriceId,
	getAddonPriceId,
	issueSubscriptionRefund
} from '$lib/server/stripe-billing';

const VALID_ADDON_KEYS = new Set<string>(ADDONS.map((a) => a.key));
const PAID_TIERS = new Set(['market', 'pro']);

function fmtAmount(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

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
				subscriptionRefundedAt: true,
				subscriptionPausedAt: true,
				pauseUntil: true,
				timezone: true,
				stripeCustomerId: true,
				stripeSubscriptionId: true,
				addons: true
			}
		})
	]);

	let nextBillingDate: string | null = null;
	let periodStart: string | null = null;
	let billingInterval: BillingInterval = 'monthly';

	// Account utilities card data: default payment method + recent invoices.
	// Empty defaults so the card can render even when the vendor has no Stripe
	// customer yet (free vendors who haven't subscribed).
	let defaultPaymentMethod: {
		brand: string;
		last4: string;
		expMonth: number;
		expYear: number;
	} | null = null;
	let totalPaymentMethods = 0;
	let accountCreditCents = 0;
	let recentInvoices: Array<{
		id: string;
		number: string | null;
		created: number;
		status: string;
		total: number;
		creditAppliedCents: number;
		hostedInvoiceUrl: string | null;
		invoicePdf: string | null;
		type: 'invoice' | 'credit_note' | 'refund';
	}> = [];

	if (vendorRecord?.stripeCustomerId) {
		const stripe = getOrderLocalStripe();

		// subscription is hoisted here so the customer-scoped block below can read
		// it for subDefaultId resolution. For ex-paid Starter vendors (no active
		// subscription) it stays null — the resolution chain falls through to
		// customerDefaultId or first card, which is correct.
		let subscription: Stripe.Subscription | null = null;

		// Subscription-specific data — only when a live subscription exists.
		// billingInterval, nextBillingDate, and periodStart only make sense with
		// a current subscription; ex-paid Starter vendors skip this block entirely
		// and those fields stay at their defaults (null / 'monthly').
		if (vendorRecord.stripeSubscriptionId) {
			// 1. Subscription retrieve (critical — carries billingInterval).
			// Rarely fails for a real subscription. If it does (deleted on Stripe),
			// the page still renders with empty billing details.
			try {
				subscription = await stripe.subscriptions.retrieve(vendorRecord.stripeSubscriptionId, {
					expand: ['items']
				});
			} catch (err) {
				console.error('[billing load] subscription retrieve failed:', err);
			}

			if (subscription) {
				const planItem =
					subscription.items.data.find((i) => {
						const meta = i.price.metadata?.type;
						return meta === 'plan' || !meta;
					}) ?? subscription.items.data[0];
				// billingInterval from the subscription's own price — NOT gated behind createPreview.
				// Must stay correct even when the preview call fails (e.g. cancel_at_period_end).
				billingInterval = planItem?.price.recurring?.interval === 'year' ? 'annual' : 'monthly';
			}

			// 2. Invoice preview (fragile — throws for subscriptions with cancel_at_period_end
			// because there's no upcoming invoice to preview). Its failure ONLY affects
			// nextBillingDate / periodStart; nothing else is in this try block.
			try {
				const preview = await stripe.invoices.createPreview({
					subscription: vendorRecord.stripeSubscriptionId
				});
				periodStart = new Date(preview.period_start * 1000).toISOString();
				nextBillingDate = new Date(preview.period_end * 1000).toISOString();
			} catch (err) {
				// Expected when the subscription is scheduled to cancel — fall back to the
				// subscription's own period bounds so the UI still has a date to show.
				const item = subscription?.items.data[0];
				if (item?.current_period_end) {
					nextBillingDate = new Date(item.current_period_end * 1000).toISOString();
				}
				if (item?.current_period_start) {
					periodStart = new Date(item.current_period_start * 1000).toISOString();
				}
				console.error(
					'[billing load] invoice preview unavailable (expected for ending subscriptions):',
					err
				);
			}
		}

		// 3. Customer-scoped data (payment methods, invoices, charges, credit notes,
		// balance) — runs for any vendor with a Stripe customer record, including
		// ex-paid Starter vendors. These are historical / account-state queries
		// that don't depend on a current subscription.
		try {
			const [pmList, invoiceList, customer, creditNoteList, chargeList] = await Promise.all([
				stripe.paymentMethods.list({
					customer: vendorRecord.stripeCustomerId,
					type: 'card'
				}),
				stripe.invoices.list({ customer: vendorRecord.stripeCustomerId, limit: 3 }),
				stripe.customers.retrieve(vendorRecord.stripeCustomerId),
				stripe.creditNotes.list({ customer: vendorRecord.stripeCustomerId, limit: 3 }),
				// Refunds: list charges for this customer, then extract refunds from each.
				// refunds.list doesn't filter by customer directly, so charges.list is the
				// only customer-scoped path to refund objects.
				stripe.charges.list({
					customer: vendorRecord.stripeCustomerId,
					limit: 10,
					expand: ['data.refunds']
				})
			]);

			totalPaymentMethods = pmList.data.length;

			// Subscription's default PM takes priority over customer-level default.
			// For ex-paid Starter vendors, subscription is null — falls through to
			// customerDefaultId or first card.
			const subDefaultId =
				typeof subscription?.default_payment_method === 'string'
					? subscription.default_payment_method
					: (subscription?.default_payment_method?.id ?? null);
			const customerDefaultId =
				!customer.deleted && customer.invoice_settings.default_payment_method
					? typeof customer.invoice_settings.default_payment_method === 'string'
						? customer.invoice_settings.default_payment_method
						: customer.invoice_settings.default_payment_method.id
					: null;
			const defaultPm =
				pmList.data.find((pm) => pm.id === subDefaultId) ??
				pmList.data.find((pm) => pm.id === customerDefaultId) ??
				pmList.data[0];

			// Self-heal: if the customer has no default payment method set but we
			// resolved a usable card, promote it now. Backstop to the webhook
			// promotions — guarantees the invariant holds by the time the vendor
			// views this page. Idempotent: no-op once customerDefaultId is set.
			if (!customerDefaultId && defaultPm?.id) {
				try {
					await stripe.customers.update(vendorRecord.stripeCustomerId, {
						invoice_settings: { default_payment_method: defaultPm.id }
					});
				} catch (err) {
					console.error('[billing load] failed to self-heal customer default payment method:', err);
				}
			}

			if (defaultPm?.card) {
				defaultPaymentMethod = {
					brand: defaultPm.card.brand,
					last4: defaultPm.card.last4,
					expMonth: defaultPm.card.exp_month,
					expYear: defaultPm.card.exp_year
				};
			}

			// customer.balance is negative when Stripe owes the customer money
			// (credit from always_invoice negative invoices on downgrades).
			if (!customer.deleted && (customer.balance ?? 0) < 0) {
				accountCreditCents = Math.abs(customer.balance!);
			}

			const invoiceRows = invoiceList.data.map((inv) => {
				// Stripe's balance fields: negative = credit owed to vendor. A less-negative
				// ending_balance vs starting_balance means credit was applied to this invoice.
				const startingBalance = inv.starting_balance ?? 0;
				const endingBalance = inv.ending_balance ?? 0;
				const creditAppliedCents = Math.max(0, endingBalance - startingBalance);

				return {
					id: inv.id ?? '',
					number: inv.number,
					created: inv.created,
					status: inv.status ?? 'draft',
					total: inv.total,
					creditAppliedCents,
					hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
					invoicePdf: inv.invoice_pdf ?? null,
					type: 'invoice' as const
				};
			});
			const creditNoteRows = creditNoteList.data.map((cn) => ({
				id: cn.id,
				number: cn.number ?? null,
				created: cn.created,
				status: cn.status,
				total: -(cn.total ?? 0),
				creditAppliedCents: 0,
				hostedInvoiceUrl: null,
				invoicePdf: cn.pdf ?? null,
				type: 'credit_note' as const
			}));
			const refundEntries = chargeList.data
				.flatMap((charge) =>
					(charge.refunds?.data ?? []).map((refund) => ({
						id: refund.id,
						number: null,
						created: refund.created,
						status: refund.status ?? 'succeeded',
						total: -(refund.amount ?? 0),
						creditAppliedCents: 0,
						hostedInvoiceUrl: null,
						invoicePdf: null,
						type: 'refund' as const
					}))
				)
				.sort((a, b) => b.created - a.created)
				.slice(0, 5);
			recentInvoices = [...invoiceRows, ...creditNoteRows, ...refundEntries]
				.sort((a, b) => b.created - a.created)
				.slice(0, 5);
		} catch (err) {
			console.error('[billing load] payment methods / invoices fetch failed:', err);
			// defaultPaymentMethod / totalPaymentMethods / recentInvoices stay at their
			// empty defaults — the account utilities card renders its empty state.
		}
	}

	return {
		itemCount: countResult[0]?.count ?? 0,
		defaultPaymentMethod,
		totalPaymentMethods,
		accountCreditCents,
		recentInvoices,
		subscriptionTier: vendorRecord?.subscriptionTier ?? 'starter',
		subscriptionStatus: vendorRecord?.subscriptionStatus ?? 'active',
		subscriptionEndsAt: vendorRecord?.subscriptionEndsAt
			? vendorRecord.subscriptionEndsAt.toISOString()
			: null,
		subscriptionRefundedAt: vendorRecord?.subscriptionRefundedAt
			? vendorRecord.subscriptionRefundedAt.toISOString()
			: null,
		hasStripeSubscription: !!vendorRecord?.stripeSubscriptionId,
		hasStripeCustomer: !!vendorRecord?.stripeCustomerId,
		addons: (vendorRecord?.addons ?? []) as AddonItem[],
		nextBillingDate,
		periodStart,
		billingInterval,
		subscriptionPausedAt: vendorRecord?.subscriptionPausedAt
			? vendorRecord.subscriptionPausedAt.toISOString()
			: null,
		pauseUntil: vendorRecord?.pauseUntil ? vendorRecord.pauseUntil.toISOString() : null,
		vendorTimezone: vendorRecord?.timezone ?? 'America/New_York'
	};
};

export const actions: Actions = {
	upgrade: async ({ request, locals }) => {
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
			let existingSubscription: Stripe.Subscription | null = null;
			try {
				existingSubscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId, {
					expand: ['items']
				});
			} catch (err) {
				// Subscription doesn't exist on Stripe (deleted, or wiped test env) — treat
				// as no subscription and fall through to create a fresh one via checkout.
				console.error('[upgrade] subscription retrieve failed, treating as no subscription:', err);
			}

			const isLive =
				existingSubscription?.status === 'active' || existingSubscription?.status === 'trialing';

			if (existingSubscription && isLive) {
				const planItem =
					existingSubscription.items.data.find((i) => {
						const meta = i.price.metadata?.type;
						return meta === 'plan' || !meta;
					}) ?? existingSubscription.items.data[0];
				if (planItem) {
					// always_invoice generates the proration invoice immediately and auto-charges
					// it against the customer's default PM (invariant maintained by webhook
					// promotion + load self-heal). No checkout redirect needed for paid→paid.
					await stripe.subscriptionItems.update(planItem.id, {
						price: priceId,
						proration_behavior: 'always_invoice'
					});
					await db
						.update(vendor)
						.set({ subscriptionTier: planKey, subscriptionEndsAt: null, updatedAt: new Date() })
						.where(eq(vendor.id, vendorId));
					const fromPlanName =
						(record.subscriptionTier ?? 'plan').charAt(0).toUpperCase() +
						(record.subscriptionTier ?? 'plan').slice(1);
					const toPlanName = planKey.charAt(0).toUpperCase() + planKey.slice(1);
					await recordNotification({
						vendorId,
						category: 'subscription_tier_changed',
						title: 'Plan upgraded',
						body: `Your plan changed from ${fromPlanName} to ${toPlanName}.`,
						severity: 'info',
						actionUrl: '/dashboard/account/billing',
						actionLabel: 'View billing'
					});
					if (record.email) {
						await sendEmail({
							to: record.email,
							subject: `Your Order Local plan has been upgraded to ${toPlanName}`,
							html: subscriptionTierChangedEmail({
								recipientName: record.name,
								fromPlanName,
								toPlanName,
								direction: 'upgrade'
							}),
							category: 'subscription_tier_changed'
						}).catch(console.error);
					}
					return { success: true, upgraded: true };
				}
			}
			// Not live, no plan item, or subscription doesn't exist — fall through.
		}

		// Fall-through: no live subscription. Create a SetupIntent — no Stripe customer
		// or subscription yet. Those come into existence only when the vendor actually
		// completes payment in the checkout page (finalizeSubscription action).
		//
		// Why SetupIntent and not PaymentIntent: SetupIntent saves the card without
		// charging. The actual charge happens via the subscription's first invoice,
		// which Stripe auto-charges against the saved card the moment the subscription
		// is created. This is the standard Stripe pattern for "collect card now, bill
		// recurring later."
		const setupIntent = await stripe.setupIntents.create({
			payment_method_types: ['card'],
			usage: 'off_session',
			metadata: { vendorId: String(vendorId), planKey, interval }
		});

		if (!setupIntent.client_secret) {
			return fail(500, { error: 'Could not initialize checkout. Please try again.' });
		}

		const params = new URLSearchParams({
			setupIntentClientSecret: setupIntent.client_secret,
			setupIntentId: setupIntent.id,
			planKey,
			interval
		});
		redirect(303, `/dashboard/account/billing/checkout?${params.toString()}`);
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
			columns: { stripeSubscriptionId: true, subscriptionTier: true, name: true, email: true }
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

			// When the Stripe subscription is already dead the vendor effectively wants
			// Starter and already has it — sync the DB and report success.
			async function syncToStarter() {
				await db
					.update(vendor)
					.set({
						subscriptionTier: 'starter',
						subscriptionEndsAt: null,
						stripeSubscriptionId: null,
						addons: [],
						updatedAt: new Date()
					})
					.where(eq(vendor.id, vendorId));
			}

			let subscription: Stripe.Subscription;
			try {
				subscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId);
			} catch (err) {
				// Subscription not found on Stripe — DB is pointing at a ghost.
				console.error('[downgrade] subscription retrieve failed:', err);
				await syncToStarter();
				return { success: true, downgraded: true, alreadyEnded: true };
			}

			if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
				await syncToStarter();
				return { success: true, downgraded: true, alreadyEnded: true };
			}

			const bucket = Math.floor(Date.now() / 60000);
			let updated: Stripe.Subscription;
			try {
				updated = await stripe.subscriptions.update(
					record.stripeSubscriptionId,
					{ cancel_at_period_end: true },
					{ idempotencyKey: `sub-update:${vendorId}:cancel-schedule:${bucket}` }
				);
			} catch (err) {
				const message = err instanceof Error ? err.message : '';
				if (message.includes('canceled subscription')) {
					await syncToStarter();
					return { success: true, downgraded: true, alreadyEnded: true };
				}
				console.error('[downgrade] subscription update failed:', err);
				return fail(500, { error: 'Could not schedule cancellation. Please try again.' });
			}

			// Mirror the scheduled-end state to DB so UI renders correctly without
			// waiting for the webhook. Webhook will reconfirm.
			// cancel_at is always populated by Stripe when cancel_at_period_end is set.
			const endsAt = updated.cancel_at ? new Date(updated.cancel_at * 1000) : null;

			await db
				.update(vendor)
				.set({
					subscriptionEndsAt: endsAt,
					updatedAt: new Date()
				})
				.where(eq(vendor.id, vendorId));
			if (endsAt) {
				const planName =
					(record?.subscriptionTier ?? 'plan').charAt(0).toUpperCase() +
					(record?.subscriptionTier ?? 'plan').slice(1);
				const accessUntil = endsAt.toLocaleDateString('en-US', {
					month: 'long',
					day: 'numeric',
					year: 'numeric'
				});
				await recordNotification({
					vendorId,
					category: 'subscription_cancellation_scheduled',
					title: 'Cancellation scheduled',
					body: `Your ${planName} subscription will end on ${accessUntil}.`,
					severity: 'warning',
					actionUrl: '/dashboard/account/billing',
					actionLabel: 'View billing'
				});
				if (record?.email) {
					await sendEmail({
						to: record.email,
						subject: `Your Order Local ${planName} subscription is scheduled to cancel`,
						html: subscriptionCancellationScheduledEmail({
							recipientName: record.name,
							planName,
							accessUntil
						}),
						category: 'subscription_cancellation_scheduled'
					}).catch(console.error);
				}
			}
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

		// A canceled subscription can't be moved to a different paid tier — sync DB to
		// Starter so the UI stops showing a stale paid tier, then tell the vendor to re-subscribe.
		if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
			await db
				.update(vendor)
				.set({
					subscriptionTier: 'starter',
					subscriptionEndsAt: null,
					stripeSubscriptionId: null,
					addons: [],
					updatedAt: new Date()
				})
				.where(eq(vendor.id, vendorId));
			return fail(400, {
				error: 'Your previous subscription has ended. Please choose a plan to subscribe again.'
			});
		}

		const planItem =
			subscription.items.data.find((i) => {
				const meta = i.price.metadata?.type;
				return meta === 'plan' || !meta;
			}) ?? subscription.items.data[0];
		if (!planItem) return fail(500, { error: 'Could not find subscription item.' });

		try {
			await stripe.subscriptionItems.update(planItem.id, {
				price: priceId,
				proration_behavior: 'always_invoice'
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : '';
			if (message.includes('canceled subscription')) {
				await db
					.update(vendor)
					.set({
						subscriptionTier: 'starter',
						subscriptionEndsAt: null,
						stripeSubscriptionId: null,
						addons: [],
						updatedAt: new Date()
					})
					.where(eq(vendor.id, vendorId));
				return fail(400, {
					error: 'Your previous subscription has ended. Please choose a plan to subscribe again.'
				});
			}
			console.error('[downgrade] subscriptionItems update failed:', err);
			return fail(500, { error: 'Could not change plan. Please try again.' });
		}
		await db
			.update(vendor)
			.set({ subscriptionTier: planKey, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		const fromPlanName =
			(record?.subscriptionTier ?? 'plan').charAt(0).toUpperCase() +
			(record?.subscriptionTier ?? 'plan').slice(1);
		const toPlanName = (planKey ?? 'plan').charAt(0).toUpperCase() + (planKey ?? 'plan').slice(1);
		await recordNotification({
			vendorId,
			category: 'subscription_tier_changed',
			title: 'Plan changed',
			body: `Your plan changed from ${fromPlanName} to ${toPlanName}.`,
			severity: 'info',
			actionUrl: '/dashboard/account/billing',
			actionLabel: 'View billing'
		});
		if (record?.email) {
			await sendEmail({
				to: record.email,
				subject: `Your Order Local plan has been changed to ${toPlanName}`,
				html: subscriptionTierChangedEmail({
					recipientName: record.name,
					fromPlanName,
					toPlanName,
					direction: 'downgrade'
				}),
				category: 'subscription_tier_changed'
			}).catch(console.error);
		}
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
			columns: {
				stripeSubscriptionId: true,
				subscriptionTier: true,
				stripeCustomerId: true,
				name: true,
				email: true
			}
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
		// Expand payments here — needed for the refund path (annual → monthly + refund choice).
		// The expand is harmless for the monthly → annual path.
		const subscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId, {
			expand: ['items', 'latest_invoice.payments.data.payment']
		});
		const planItem =
			subscription.items.data.find((i) => {
				const meta = i.price.metadata?.type;
				return meta === 'plan' || !meta;
			}) ?? subscription.items.data[0];
		if (!planItem) return fail(500, { error: 'Could not find subscription item.' });

		const currentInterval = planItem.price.recurring?.interval === 'year' ? 'annual' : 'monthly';
		if (currentInterval === interval) return fail(400, { error: `Already billing ${interval}.` });

		if (interval === 'annual') {
			// monthly → annual: always_invoice generates the proration invoice immediately
			// and auto-charges against the customer's default PM. No checkout redirect.
			await stripe.subscriptionItems.update(planItem.id, {
				price: priceId,
				proration_behavior: 'always_invoice'
			});
			const planName =
				record.subscriptionTier.charAt(0).toUpperCase() + record.subscriptionTier.slice(1);
			await recordNotification({
				vendorId,
				category: 'subscription_interval_changed',
				title: 'Switched to annual billing',
				body: `Your ${planName} plan is now billed annually.`,
				severity: 'info',
				actionUrl: '/dashboard/account/billing',
				actionLabel: 'View billing'
			});
			if (record.email) {
				await sendEmail({
					to: record.email,
					subject: `Your Order Local plan is now billed annually`,
					html: subscriptionIntervalChangedEmail({
						recipientName: record.name,
						planName,
						fromInterval: 'monthly',
						toInterval: 'annual'
					}),
					category: 'subscription_interval_changed'
				}).catch(console.error);
			}
			return { success: true, switched: true };
		} else {
			// annual → monthly: vendor chooses credit (deferred on next invoice) or
			// immediate cash refund for the unused annual portion.
			const switchChoice = formData.get('switchChoice')?.toString();
			const useRefund = switchChoice === 'refund';

			if (useRefund) {
				// Refund path: proration_behavior: 'none' prevents Stripe from issuing a
				// credit memo alongside the cash refund — that would double-compensate.
				const periodEndUnix = planItem.current_period_end;
				if (!periodEndUnix) return fail(500, { error: 'Subscription period_end unavailable.' });

				const tier = TIERS.find((t) => t.key === record.subscriptionTier);
				const annualTotal = tier && 'annualTotal' in tier ? (tier.annualTotal as number) : 0;
				if (!annualTotal) return fail(500, { error: 'Annual price not configured.' });

				const { refundCents } = cancelImmediateRefundPreview({
					periodEnd: new Date(periodEndUnix * 1000),
					annualTotalCents: annualTotal * 100
				});

				await stripe.subscriptionItems.update(planItem.id, {
					price: priceId,
					proration_behavior: 'none'
				});

				if (refundCents > 0) {
					await issueSubscriptionRefund(
						stripe,
						subscription,
						record.stripeCustomerId,
						refundCents,
						vendorId,
						`Order Local refund — annual to monthly switch (${refundCents} cents)`
					);
				}

				const planName =
					record.subscriptionTier.charAt(0).toUpperCase() + record.subscriptionTier.slice(1);
				await recordNotification({
					vendorId,
					category: 'subscription_interval_changed',
					title: 'Switched to monthly billing',
					body:
						refundCents > 0
							? `Your ${planName} plan is now billed monthly. Refund of ${fmtAmount(refundCents)} on the way.`
							: `Your ${planName} plan is now billed monthly.`,
					severity: 'info',
					actionUrl: '/dashboard/account/billing',
					actionLabel: 'View billing'
				});
				if (record.email) {
					await sendEmail({
						to: record.email,
						subject:
							refundCents > 0
								? `Your Order Local plan is now billed monthly — refund on the way`
								: `Your Order Local plan is now billed monthly`,
						html: subscriptionIntervalChangedEmail({
							recipientName: record.name,
							planName,
							fromInterval: 'annual',
							toInterval: 'monthly',
							refundAmount: refundCents > 0 ? fmtAmount(refundCents) : undefined
						}),
						category: 'subscription_interval_changed'
					}).catch(console.error);
				}
				return { success: true, switched: true, refunded: refundCents > 0 };
			} else {
				// Credit path: always_invoice generates a credit memo immediately for the
				// unused annual time rather than parking it on next year's renewal.
				await stripe.subscriptionItems.update(planItem.id, {
					price: priceId,
					proration_behavior: 'always_invoice'
				});
				const planName =
					record.subscriptionTier.charAt(0).toUpperCase() + record.subscriptionTier.slice(1);
				await recordNotification({
					vendorId,
					category: 'subscription_interval_changed',
					title: 'Switched to monthly billing',
					body: `Your ${planName} plan is now billed monthly.`,
					severity: 'info',
					actionUrl: '/dashboard/account/billing',
					actionLabel: 'View billing'
				});
				if (record.email) {
					await sendEmail({
						to: record.email,
						subject: `Your Order Local plan is now billed monthly`,
						html: subscriptionIntervalChangedEmail({
							recipientName: record.name,
							planName,
							fromInterval: 'annual',
							toInterval: 'monthly'
						}),
						category: 'subscription_interval_changed'
					}).catch(console.error);
				}
				return { success: true, switched: true };
			}
		}
	},

	reactivate: async ({ locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				stripeSubscriptionId: true,
				subscriptionEndsAt: true,
				email: true,
				name: true,
				subscriptionTier: true
			}
		});
		if (!record?.stripeSubscriptionId) return fail(400, { error: 'No active subscription.' });
		if (!record.subscriptionEndsAt) return fail(400, { error: 'No cancellation scheduled.' });

		const stripe = getOrderLocalStripe();
		const bucket = Math.floor(Date.now() / 60000);
		await stripe.subscriptions.update(
			record.stripeSubscriptionId,
			{ cancel_at_period_end: false },
			{ idempotencyKey: `sub-update:${vendorId}:reactivate:${bucket}` }
		);
		await db
			.update(vendor)
			.set({ subscriptionEndsAt: null, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		if (record.subscriptionTier) {
			const planName =
				record.subscriptionTier.charAt(0).toUpperCase() + record.subscriptionTier.slice(1);
			await recordNotification({
				vendorId,
				category: 'subscription_reactivated',
				title: 'Subscription reactivated',
				body: `Your ${planName} subscription will continue. Cancellation was withdrawn.`,
				severity: 'info',
				actionUrl: '/dashboard/account/billing',
				actionLabel: 'View billing'
			});
			if (record.email) {
				await sendEmail({
					to: record.email,
					subject: `Your Order Local ${planName} subscription is staying active`,
					html: subscriptionReactivatedEmail({
						recipientName: record.name,
						planName
					}),
					category: 'subscription_reactivated'
				}).catch(console.error);
			}
		}
		return { success: true, reactivated: true };
	},

	cancelImmediate: async ({ locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				stripeSubscriptionId: true,
				stripeCustomerId: true,
				subscriptionTier: true,
				subscriptionRefundedAt: true,
				name: true,
				email: true
			}
		});
		if (!record?.stripeSubscriptionId)
			return fail(400, { error: 'No active subscription to cancel.' });
		if (!record.subscriptionTier || !PAID_TIERS.has(record.subscriptionTier))
			return fail(400, { error: 'Only paid subscriptions can be cancelled this way.' });
		if (record.subscriptionRefundedAt)
			return fail(400, { error: 'A refund has already been issued for this subscription.' });

		const stripe = getOrderLocalStripe();
		const subscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId, {
			// Stripe v22: payment_intent moved off Invoice. Expand to 4 levels (Stripe's max).
			// payment_intent comes back as a string ID at this depth, which is all we need —
			// the code below retrieves the PI separately via paymentIntents.retrieve.
			expand: ['items', 'latest_invoice.payments.data.payment']
		});
		const planItem =
			subscription.items.data.find((i) => {
				const meta = i.price.metadata?.type;
				return meta === 'plan' || !meta;
			}) ?? subscription.items.data[0];
		if (!planItem) return fail(500, { error: 'Could not find subscription item.' });

		// Annual-only guard.
		if (planItem.price.recurring?.interval !== 'year')
			return fail(400, { error: 'Immediate cancellation with refund is annual-only.' });

		const periodEndUnix = planItem.current_period_end;
		if (!periodEndUnix) return fail(500, { error: 'Subscription period_end unavailable.' });
		const periodEnd = new Date(periodEndUnix * 1000);

		const tier = TIERS.find((t) => t.key === record.subscriptionTier);
		const annualTotal = tier && 'annualTotal' in tier ? (tier.annualTotal as number) : 0;
		if (!annualTotal) return fail(500, { error: 'Annual price not configured.' });

		const { cancelEffective, refundCents } = cancelImmediateRefundPreview({
			periodEnd,
			annualTotalCents: annualTotal * 100
		});

		// Issue refund via shared helper (charge resolution + balance credit fallback).
		let refundIssued = false;
		if (refundCents > 0) {
			const result = await issueSubscriptionRefund(
				stripe,
				subscription,
				record.stripeCustomerId,
				refundCents,
				vendorId,
				`Order Local refund — immediate cancellation (${refundCents} cents)`
			);
			refundIssued = result.refundIssued;
		}

		// Persist refund state and cancel-effective BEFORE calling cancel.
		// If cancel fails after this point, the refund record stays — webhook will
		// eventually reconcile subscription state when Stripe confirms.
		await db
			.update(vendor)
			.set({
				subscriptionRefundedAt: refundIssued || refundCents === 0 ? new Date() : null,
				subscriptionEndsAt: cancelEffective,
				updatedAt: new Date()
			})
			.where(eq(vendor.id, vendorId));

		// Cancel the subscription immediately. Stripe fires customer.subscription.deleted;
		// existing webhook flips tier to starter, clears addons, etc.
		try {
			await stripe.subscriptions.cancel(record.stripeSubscriptionId);
		} catch (err) {
			console.error('Subscription cancel failed after refund:', err);
			return { success: true, cancelDeferred: true, refundCents };
		}

		if (record.subscriptionTier) {
			const planName =
				record.subscriptionTier.charAt(0).toUpperCase() + record.subscriptionTier.slice(1);
			await recordNotification({
				vendorId,
				category: 'subscription_cancellation_immediate',
				title: 'Subscription cancelled',
				body: `Your ${planName} subscription has been cancelled. Refund of ${fmtAmount(refundCents)} on the way.`,
				severity: 'critical',
				actionUrl: '/dashboard/account/billing',
				actionLabel: 'View billing'
			});
			if (record.email) {
				await sendEmail({
					to: record.email,
					subject: `Your Order Local ${planName} subscription has been cancelled`,
					html: subscriptionCancellationImmediateEmail({
						recipientName: record.name,
						planName,
						refundAmount: fmtAmount(refundCents)
					}),
					category: 'subscription_cancellation_immediate'
				}).catch(console.error);
			}
		}
		return { success: true, cancelImmediate: true, refundCents };
	},

	activateAddon: async ({ request, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const key = formData.get('key')?.toString();

		if (!key || !VALID_ADDON_KEYS.has(key)) return fail(400, { error: 'Invalid add-on.' });

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				subscriptionTier: true,
				stripeSubscriptionId: true,
				addons: true,
				name: true,
				email: true
			}
		});
		if (!record?.subscriptionTier) return fail(400, { error: 'Vendor record not found.' });
		if (!PAID_TIERS.has(record.subscriptionTier))
			return fail(400, { error: 'Add-ons require a Market or Pro plan. Upgrade to activate.' });
		if (!record.stripeSubscriptionId)
			return fail(400, {
				error: 'No active Stripe subscription found. Complete your plan upgrade first.'
			});

		const current = (record.addons ?? []) as AddonItem[];
		if (current.some((a) => a.key === key)) return { success: true };

		const priceId = getAddonPriceId(key);
		if (!priceId) return fail(500, { error: 'Add-on price not configured. Contact support.' });

		const stripe = getOrderLocalStripe();
		const item = await stripe.subscriptionItems.create({
			subscription: record.stripeSubscriptionId,
			price: priceId,
			proration_behavior: 'always_invoice'
		});
		await db
			.update(vendor)
			.set({ addons: [...current, { key, stripeItemId: item.id }], updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		const addonName = ADDONS.find((a) => a.key === key)?.name ?? key;
		await recordNotification({
			vendorId,
			category: 'subscription_addon_changed',
			title: 'Add-on activated',
			body: `${addonName} is now active on your account.`,
			severity: 'info',
			actionUrl: '/dashboard/account/billing',
			actionLabel: 'View billing'
		});
		if (record.email) {
			await sendEmail({
				to: record.email,
				subject: `${addonName} add-on activated on your Order Local account`,
				html: subscriptionAddonChangedEmail({
					recipientName: record.name,
					addonName,
					direction: 'activated'
				}),
				category: 'subscription_addon_changed'
			}).catch(console.error);
		}
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
			columns: { addons: true, name: true, email: true }
		});
		const current = (record?.addons ?? []) as AddonItem[];
		const addonEntry = current.find((a) => a.key === key);
		if (!addonEntry) return { success: true };

		const stripe = getOrderLocalStripe();
		try {
			await stripe.subscriptionItems.del(addonEntry.stripeItemId, {
				proration_behavior: 'always_invoice'
			});
		} catch (e: unknown) {
			if (!(e instanceof Error && e.message.includes('No such subscription_item'))) throw e;
		}
		await db
			.update(vendor)
			.set({ addons: current.filter((a) => a.key !== key), updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		const addonName = ADDONS.find((a) => a.key === key)?.name ?? key;
		await recordNotification({
			vendorId,
			category: 'subscription_addon_changed',
			title: 'Add-on deactivated',
			body: `${addonName} has been removed from your account.`,
			severity: 'info',
			actionUrl: '/dashboard/account/billing',
			actionLabel: 'View billing'
		});
		if (record?.email) {
			await sendEmail({
				to: record.email,
				subject: `${addonName} add-on deactivated on your Order Local account`,
				html: subscriptionAddonChangedEmail({
					recipientName: record.name,
					addonName,
					direction: 'deactivated'
				}),
				category: 'subscription_addon_changed'
			}).catch(console.error);
		}
		return { success: true };
	},

	pauseSubscription: async ({ request, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const pauseUntilDate = formData.get('pauseUntilDate')?.toString();

		if (!pauseUntilDate || !/^\d{4}-\d{2}-\d{2}$/.test(pauseUntilDate))
			return fail(400, { error: 'Invalid pause date.' });

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				subscriptionTier: true,
				subscriptionStatus: true,
				subscriptionEndsAt: true,
				subscriptionPausedAt: true,
				stripeSubscriptionId: true,
				timezone: true,
				name: true,
				email: true
			}
		});

		if (!record?.subscriptionTier || !PAID_TIERS.has(record.subscriptionTier))
			return fail(400, { error: 'Only paid subscriptions can be paused.' });
		if (!record.stripeSubscriptionId)
			return fail(400, { error: 'No active subscription to pause.' });
		if (record.subscriptionPausedAt) return fail(400, { error: 'Subscription is already paused.' });
		if (record.subscriptionEndsAt)
			return fail(400, { error: 'Cannot pause a subscription that is scheduled to cancel.' });
		if (record.subscriptionStatus === 'past_due')
			return fail(400, { error: 'Cannot pause a subscription with a past-due payment.' });

		const today = new Date();
		const todayStr = today.toISOString().slice(0, 10);
		if (pauseUntilDate <= todayStr)
			return fail(400, { error: 'Pause date must be in the future.' });

		const maxDate = new Date(today);
		maxDate.setMonth(maxDate.getMonth() + 6);
		const maxStr = maxDate.toISOString().slice(0, 10);
		if (pauseUntilDate > maxStr)
			return fail(400, { error: 'Pause duration cannot exceed 6 months.' });

		const tz = record.timezone ?? 'America/New_York';
		const resumeAt = pauseUntilTimestamp(pauseUntilDate, tz);

		const stripe = getOrderLocalStripe();
		const bucket = Math.floor(Date.now() / 60000);
		await stripe.subscriptions.update(
			record.stripeSubscriptionId,
			{
				pause_collection: { behavior: 'mark_uncollectible' },
				// Informational only — gives Stripe-dashboard visibility into when the pause
				// is scheduled to end. Nothing in our code reads these back; vendor.pauseUntil
				// is the source of truth. Empty string deletes a metadata key in Stripe.
				metadata: {
					pause_until: resumeAt.toISOString().slice(0, 10),
					paused_at: new Date().toISOString().slice(0, 10)
				}
			},
			{ idempotencyKey: `sub-update:${vendorId}:pause:${bucket}` }
		);

		const now = new Date();
		await db
			.update(vendor)
			.set({ subscriptionPausedAt: now, pauseUntil: resumeAt, updatedAt: now })
			.where(eq(vendor.id, vendorId));

		const planName =
			record.subscriptionTier.charAt(0).toUpperCase() + record.subscriptionTier.slice(1);
		const pauseUntilStr = resumeAt.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
		await recordNotification({
			vendorId,
			category: 'pause_confirmed',
			title: 'Subscription paused',
			body: `Your ${planName} subscription is paused until ${pauseUntilStr}.`,
			severity: 'info',
			actionUrl: '/dashboard/account/billing',
			actionLabel: 'View billing'
		});
		if (record.email) {
			await sendEmail({
				to: record.email,
				subject: 'Your Order Local subscription has been paused',
				html: pauseConfirmedEmail({
					recipientName: record.name,
					planName,
					pauseUntil: pauseUntilStr
				}),
				category: 'pause_confirmed'
			}).catch(console.error);
		}

		redirect(303, '/dashboard/account/billing?paused=1');
	},

	resumeSubscription: async ({ locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				subscriptionPausedAt: true,
				stripeSubscriptionId: true,
				subscriptionTier: true,
				name: true,
				email: true
			}
		});

		if (!record?.subscriptionPausedAt) return fail(400, { error: 'Subscription is not paused.' });
		if (!record.stripeSubscriptionId) return fail(400, { error: 'No active subscription.' });

		const stripe = getOrderLocalStripe();
		const bucket = Math.floor(Date.now() / 60000);
		await stripe.subscriptions.update(
			record.stripeSubscriptionId,
			{
				pause_collection: '' as Stripe.Emptyable<Stripe.SubscriptionUpdateParams.PauseCollection>,
				metadata: { pause_until: '', paused_at: '' }
			},
			{ idempotencyKey: `sub-update:${vendorId}:resume:${bucket}` }
		);

		const now = new Date();
		await db
			.update(vendor)
			.set({ subscriptionPausedAt: null, pauseUntil: null, updatedAt: now })
			.where(eq(vendor.id, vendorId));

		const planName =
			(record.subscriptionTier ?? 'plan').charAt(0).toUpperCase() +
			(record.subscriptionTier ?? 'plan').slice(1);
		await recordNotification({
			vendorId,
			category: 'pause_resumed',
			title: 'Subscription resumed',
			body: `Your ${planName} subscription is active again.`,
			severity: 'info',
			actionUrl: '/dashboard/account/billing',
			actionLabel: 'View billing'
		});
		if (record.email) {
			await sendEmail({
				to: record.email,
				subject: 'Your Order Local subscription has resumed',
				html: pauseResumedEmail({ recipientName: record.name, planName }),
				category: 'pause_resumed'
			}).catch(console.error);
		}

		redirect(303, '/dashboard/account/billing?resumed=1');
	},

	refundAccountCredit: async ({ locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { stripeCustomerId: true, name: true, email: true }
		});
		if (!record?.stripeCustomerId) {
			return fail(400, { error: 'No Stripe customer on file.' });
		}

		const stripe = getOrderLocalStripe();

		// 1. Re-read the customer balance from Stripe — source of truth, not client-side amount.
		let customer: Stripe.Customer;
		try {
			const c = await stripe.customers.retrieve(record.stripeCustomerId);
			if (c.deleted) return fail(400, { error: 'Customer record is no longer available.' });
			customer = c;
		} catch (err) {
			console.error('[refundAccountCredit] customer retrieve failed:', err);
			return fail(500, { error: 'Could not read your account balance. Please try again.' });
		}

		// Stripe convention: balance < 0 = credit owed to customer.
		const balance = customer.balance ?? 0;
		if (balance >= 0) {
			return fail(400, { error: 'No account credit to refund.' });
		}
		const creditCents = Math.abs(balance);

		// 2. Find a refundable charge ≥ creditCents within Stripe's 180-day window.
		let chargeList: Stripe.ApiList<Stripe.Charge>;
		try {
			chargeList = await stripe.charges.list({
				customer: record.stripeCustomerId,
				limit: 20
			});
		} catch (err) {
			console.error('[refundAccountCredit] charges list failed:', err);
			return fail(500, { error: 'Could not look up your charges. Please try again.' });
		}

		const REFUND_WINDOW_SECONDS = 180 * 24 * 60 * 60;
		const nowSeconds = Math.floor(Date.now() / 1000);

		const eligibleCharge = chargeList.data.find((c) => {
			if (c.status !== 'succeeded') return false;
			if (c.refunded) return false;
			const refundableAmount = (c.amount ?? 0) - (c.amount_refunded ?? 0);
			if (refundableAmount < creditCents) return false;
			if (nowSeconds - c.created > REFUND_WINDOW_SECONDS) return false;
			return true;
		});

		if (!eligibleCharge) {
			return fail(400, {
				error:
					'Could not find a recent charge to refund this credit against. Please contact support and we can issue the refund manually.'
			});
		}

		// 3. Refund the credit amount to the eligible charge. Do NOT fall back to
		// balance credit on failure — this action's purpose is to CLEAR the balance.
		try {
			await stripe.refunds.create(
				{
					charge: eligibleCharge.id,
					amount: creditCents,
					metadata: { vendorId: String(vendorId), reason: 'account_credit_refund' }
				},
				{ idempotencyKey: `refund:${vendorId}:credit:${eligibleCharge.id}:${creditCents}` }
			);
		} catch (err) {
			console.error('[refundAccountCredit] refund create failed:', err);
			const message =
				err instanceof Error
					? err.message
					: 'Could not process the refund. Please contact support.';
			return fail(500, { error: message });
		}

		// 4. Zero out the customer balance. A positive createBalanceTransaction
		// (amount = +creditCents) cancels the negative customer.balance.
		// If this step fails after the refund succeeded, the card refund went through
		// but Stripe still shows credit — log loudly for manual cleanup via dashboard.
		try {
			await stripe.customers.createBalanceTransaction(
				record.stripeCustomerId,
				{
					amount: creditCents,
					currency: 'usd',
					description: `Account credit refunded to card (charge ${eligibleCharge.id})`
				},
				{ idempotencyKey: `balance-tx:${vendorId}:credit-clear:${eligibleCharge.id}` }
			);
		} catch (err) {
			console.error(
				'[refundAccountCredit] balance zeroing failed AFTER refund issued — manual cleanup required:',
				err
			);
			// Don't fail — the vendor's refund went through. Surface partial-sync warning.
			if (record.email) {
				await sendEmail({
					to: record.email,
					subject: 'Your Order Local account credit has been refunded',
					html: accountCreditRefundedEmail({
						recipientName: record.name,
						refundAmount: fmtAmount(creditCents)
					}),
					category: 'account_credit_refunded'
				}).catch(console.error);
			}
			return { success: true, creditRefunded: true, partialSync: true, refundedCents: creditCents };
		}

		if (record.email) {
			await sendEmail({
				to: record.email,
				subject: 'Your Order Local account credit has been refunded',
				html: accountCreditRefundedEmail({
					recipientName: record.name,
					refundAmount: fmtAmount(creditCents)
				}),
				category: 'account_credit_refunded'
			}).catch(console.error);
		}
		return { success: true, creditRefunded: true, refundedCents: creditCents };
	}
};
