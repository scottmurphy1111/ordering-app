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
	nextBillingAnchor,
	unixTimestamp,
	cancelImmediateRefundPreview,
	pauseUntilTimestamp
} from '$lib/billing';
import { sendEmail } from '$lib/server/email';
import { pauseConfirmedEmail } from '$lib/server/email/templates/pauseConfirmed';
import { pauseResumedEmail } from '$lib/server/email/templates/pauseResumed';
import { requireStaff } from '$lib/server/roles';
import type Stripe from 'stripe';
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
	let recentInvoices: Array<{
		id: string;
		number: string | null;
		created: number;
		status: string;
		total: number;
		hostedInvoiceUrl: string | null;
		invoicePdf: string | null;
	}> = [];

	if (vendorRecord?.stripeSubscriptionId) {
		try {
			const stripe = getOrderLocalStripe();
			const [subscription, preview, pmList, invoiceList, customer] = await Promise.all([
				stripe.subscriptions.retrieve(vendorRecord.stripeSubscriptionId, { expand: ['items'] }),
				stripe.invoices.createPreview({ subscription: vendorRecord.stripeSubscriptionId }),
				stripe.paymentMethods.list({
					customer: vendorRecord.stripeCustomerId!,
					type: 'card'
				}),
				stripe.invoices.list({ customer: vendorRecord.stripeCustomerId!, limit: 3 }),
				stripe.customers.retrieve(vendorRecord.stripeCustomerId!)
			]);

			const planItem =
				subscription.items.data.find((i) => {
					const meta = i.price.metadata?.type;
					return meta === 'plan' || !meta;
				}) ?? subscription.items.data[0];
			billingInterval = planItem?.price.recurring?.interval === 'year' ? 'annual' : 'monthly';
			periodStart = new Date(preview.period_start * 1000).toISOString();
			nextBillingDate = new Date(preview.period_end * 1000).toISOString();

			totalPaymentMethods = pmList.data.length;

			// Subscription's default payment method takes priority over customer-level
			// default. Fall back to first card if neither is set explicitly.
			const subDefaultId =
				typeof subscription.default_payment_method === 'string'
					? subscription.default_payment_method
					: (subscription.default_payment_method?.id ?? null);
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

			if (defaultPm?.card) {
				defaultPaymentMethod = {
					brand: defaultPm.card.brand,
					last4: defaultPm.card.last4,
					expMonth: defaultPm.card.exp_month,
					expYear: defaultPm.card.exp_year
				};
			}

			recentInvoices = invoiceList.data.map((inv) => ({
				id: inv.id ?? '',
				number: inv.number,
				created: inv.created,
				status: inv.status ?? 'draft',
				total: inv.total,
				hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
				invoicePdf: inv.invoice_pdf ?? null
			}));
		} catch {
			// Stripe preview unavailable — billing dates stay null, account
			// utilities stay empty. Card UI handles empty state gracefully.
		}
	}

	return {
		itemCount: countResult[0]?.count ?? 0,
		defaultPaymentMethod,
		totalPaymentMethods,
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
			const subscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId, {
				expand: ['items']
			});
			const planItem =
				subscription.items.data.find((i) => {
					const meta = i.price.metadata?.type;
					return meta === 'plan' || !meta;
				}) ?? subscription.items.data[0];
			if (planItem) {
				// Match downgrade/switchInterval: explicit create_prorations so the unused
				// current-tier time is credited and the new tier's prorated cost lands on
				// the next invoice (not charged immediately).
				await stripe.subscriptionItems.update(planItem.id, {
					price: priceId,
					proration_behavior: 'create_prorations'
				});
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

		const anchorDate = nextBillingAnchor();
		const subscription = await stripe.subscriptions.create({
			customer: customerId,
			items: [{ price: priceId }],
			payment_behavior: 'default_incomplete',
			payment_settings: {
				save_default_payment_method: 'on_subscription',
				payment_method_types: ['card']
			},
			metadata: { vendorId: String(vendorId), planKey, interval },
			// Anchor billing to the next 15th of the month.
			// Stripe creates a prorated bridge invoice immediately for the partial period
			// (today → anchor), then full-cycle invoices land on the 15th going forward.
			// If anchorDate is today (vendor signed up on the 15th), no bridge —
			// full cycle starts immediately.
			billing_cycle_anchor: unixTimestamp(anchorDate),
			proration_behavior: 'create_prorations'
		});
		await db
			.update(vendor)
			.set({
				stripeSubscriptionId: subscription.id,
				subscriptionRefundedAt: null,
				updatedAt: new Date()
			})
			.where(eq(vendor.id, vendorId));
		redirect(303, `/dashboard/account/billing/checkout?subscriptionId=${subscription.id}`);
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
		// Switching monthly ↔ annual preserves the existing billing_cycle_anchor (the 15th).
		// Stripe handles proration of the unused portion of the current cycle automatically.
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

	reactivate: async ({ locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { stripeSubscriptionId: true, subscriptionEndsAt: true }
		});
		if (!record?.stripeSubscriptionId) return fail(400, { error: 'No active subscription.' });
		if (!record.subscriptionEndsAt) return fail(400, { error: 'No cancellation scheduled.' });

		const stripe = getOrderLocalStripe();
		await stripe.subscriptions.update(record.stripeSubscriptionId, {
			cancel_at_period_end: false
		});
		await db
			.update(vendor)
			.set({ subscriptionEndsAt: null, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
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
				subscriptionRefundedAt: true
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
			// Stripe v22: payment_intent moved off Invoice. Expand payments list so we
			// can navigate to the payment intent ID, then retrieve separately for charge.
			expand: ['items', 'latest_invoice.payments.data.payment.payment_intent']
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

		// Resolve charge for refund via Stripe v22 invoice payments path:
		// Invoice.payments[0].payment_details.payment_intent → PaymentIntent.latest_charge
		let refundIssued = false;
		if (refundCents > 0) {
			const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
			const firstPayment = latestInvoice?.payments?.data?.[0];
			const piRef = firstPayment?.payment?.payment_intent;
			const paymentIntentId = typeof piRef === 'string' ? piRef : piRef?.id;

			let chargeId: string | null = null;
			if (paymentIntentId) {
				try {
					const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
						expand: ['latest_charge']
					});
					chargeId =
						typeof pi.latest_charge === 'string'
							? pi.latest_charge
							: ((pi.latest_charge as Stripe.Charge | null)?.id ?? null);
				} catch {
					// Can't retrieve PI — fall through to balance credit below
				}
			}

			if (chargeId) {
				try {
					await stripe.refunds.create({ charge: chargeId, amount: refundCents });
					refundIssued = true;
				} catch (err) {
					// Charge not refundable (disputed, expired, etc). Fall back to
					// customer balance credit — applies to next invoice if vendor
					// returns; otherwise sits on the customer record.
					console.error('Refund to charge failed; falling back to balance credit:', err);
					if (record.stripeCustomerId) {
						await stripe.customers.createBalanceTransaction(record.stripeCustomerId, {
							amount: -refundCents,
							currency: 'usd',
							description: `Order Local refund — immediate cancellation (${refundCents} cents)`
						});
						refundIssued = true;
					}
				}
			} else if (record.stripeCustomerId) {
				// No charge found (PI unavailable) — use balance credit as primary path
				await stripe.customers.createBalanceTransaction(record.stripeCustomerId, {
					amount: -refundCents,
					currency: 'usd',
					description: `Order Local refund — immediate cancellation (${refundCents} cents)`
				});
				refundIssued = true;
			}
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

		const priceId = getAddonPriceId(key);
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
		await stripe.subscriptions.update(record.stripeSubscriptionId, {
			pause_collection: { behavior: 'mark_uncollectible' }
		});

		const now = new Date();
		await db
			.update(vendor)
			.set({ subscriptionPausedAt: now, pauseUntil: resumeAt, updatedAt: now })
			.where(eq(vendor.id, vendorId));

		if (record.email) {
			const planName =
				record.subscriptionTier.charAt(0).toUpperCase() + record.subscriptionTier.slice(1);
			const pauseUntilStr = resumeAt.toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			});
			await sendEmail({
				to: record.email,
				subject: 'Your Order Local subscription has been paused',
				html: pauseConfirmedEmail({ tenantName: record.name, planName, pauseUntil: pauseUntilStr })
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
		await stripe.subscriptions.update(record.stripeSubscriptionId, {
			pause_collection: '' as Stripe.Emptyable<Stripe.SubscriptionUpdateParams.PauseCollection>
		});

		const now = new Date();
		await db
			.update(vendor)
			.set({ subscriptionPausedAt: null, pauseUntil: null, updatedAt: now })
			.where(eq(vendor.id, vendorId));

		if (record.email) {
			const planName =
				(record.subscriptionTier ?? 'plan').charAt(0).toUpperCase() +
				(record.subscriptionTier ?? 'plan').slice(1);
			await sendEmail({
				to: record.email,
				subject: 'Your Order Local subscription has resumed',
				html: pauseResumedEmail({ tenantName: record.name, planName })
			}).catch(console.error);
		}

		redirect(303, '/dashboard/account/billing?resumed=1');
	}
};
