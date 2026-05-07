import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { systemEvents } from '$lib/server/db/system-events';
import { getOrderLocalStripe, getTierKeyFromPriceId } from '$lib/server/stripe-billing';
import { sendEmail } from '$lib/server/email';
import { subscriptionConfirmedEmail } from '$lib/server/email/templates/subscriptionConfirmed';
import { paymentFailedEmail } from '$lib/server/email/templates/paymentFailed';

async function recordSystemEvent(
	eventType: string,
	status: 'ok' | 'error',
	vendorId: number | null,
	metadata?: Record<string, unknown>
) {
	try {
		await db
			.insert(systemEvents)
			.values({ eventType, status, vendorId, metadata: metadata ?? null });
	} catch (e) {
		console.error('[system-events] failed to record:', eventType, e);
	}
}

const PAID_TIERS = new Set(['market', 'pro']);

function formatAmount(cents: number): string {
	return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(unix: number): string {
	return new Date(unix * 1000).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
}

export const POST: RequestHandler = async ({ request }) => {
	const webhookSecret = env.ORDERLOCAL_STRIPE_WEBHOOK_SECRET;
	if (!webhookSecret) throw error(500, 'Billing webhook secret not configured');

	const body = await request.text();
	const signature = request.headers.get('stripe-signature');
	if (!signature) throw error(400, 'Missing stripe-signature header');

	const stripe = getOrderLocalStripe();

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
	} catch {
		throw error(400, 'Invalid webhook signature');
	}

	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				const vendorId = parseInt(session.metadata?.vendorId ?? '');
				const planKey = session.metadata?.planKey;
				if (isNaN(vendorId) || !planKey || !PAID_TIERS.has(planKey)) break;

				const subscriptionId =
					typeof session.subscription === 'string'
						? session.subscription
						: session.subscription?.id;
				const customerId =
					typeof session.customer === 'string' ? session.customer : session.customer?.id;

				await db
					.update(vendor)
					.set({
						subscriptionTier: planKey,
						subscriptionStatus: 'active',
						stripeSubscriptionId: subscriptionId ?? null,
						stripeCustomerId: customerId ?? null,
						updatedAt: new Date()
					})
					.where(eq(vendor.id, vendorId));

				const vendorRecord = await db.query.vendor.findFirst({
					where: eq(vendor.id, vendorId),
					columns: { name: true, email: true }
				});

				if (vendorRecord?.email && subscriptionId) {
					const subscription = await stripe.subscriptions.retrieve(subscriptionId);
					const item = subscription.items.data[0];
					const amount = item?.price?.unit_amount ?? 0;

					await sendEmail({
						to: vendorRecord.email,
						subject: `You're on Order Local ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`,
						html: subscriptionConfirmedEmail({
							tenantName: vendorRecord.name,
							planName: planKey.charAt(0).toUpperCase() + planKey.slice(1),
							amount: formatAmount(amount)
						})
					}).catch(console.error);
				}
				await recordSystemEvent('webhook.checkout_completed', 'ok', vendorId, {
					stripeEventId: event.id,
					planKey,
					subscriptionId: subscriptionId ?? null
				});
				break;
			}

			case 'customer.subscription.updated':
			case 'customer.subscription.created': {
				const subscription = event.data.object as Stripe.Subscription;
				const customerId =
					typeof subscription.customer === 'string'
						? subscription.customer
						: subscription.customer.id;

				const vendorRecord = await db.query.vendor.findFirst({
					where: eq(vendor.stripeCustomerId, customerId),
					columns: {
						id: true,
						name: true,
						email: true,
						subscriptionTier: true,
						subscriptionPausedAt: true
					}
				});
				if (!vendorRecord) break;

				// Resolve tier from the subscription's plan item price ID.
				const planItem =
					subscription.items.data.find((i) => {
						const meta = i.price.metadata?.type;
						return meta === 'plan' || !meta;
					}) ?? subscription.items.data[0];
				const tierKey = planItem ? getTierKeyFromPriceId(planItem.price.id) : null;

				const status =
					subscription.status === 'active' || subscription.status === 'trialing'
						? 'active'
						: subscription.status === 'past_due'
							? 'past_due'
							: subscription.status === 'canceled'
								? 'cancelled'
								: subscription.status;

				// cancel_at is always populated by Stripe when cancel_at_period_end is set.
				const endsAt =
					subscription.cancel_at_period_end && subscription.cancel_at
						? new Date(subscription.cancel_at * 1000)
						: null;

				const updates: Record<string, unknown> = {
					subscriptionStatus: status,
					subscriptionEndsAt: endsAt,
					stripeSubscriptionId: subscription.id,
					updatedAt: new Date()
				};
				// Only update tier if we successfully resolved one — guard against
				// updates fired from add-on subscription items or unrecognized prices.
				if (tierKey) updates.subscriptionTier = tierKey;

				await db.update(vendor).set(updates).where(eq(vendor.id, vendorRecord.id));

				// Defensive pause_collection mirror: keep DB in sync if Stripe's pause
				// state diverges from the vendor record (e.g. manual unpausing from the
				// Stripe dashboard). This is a best-effort mirror — the primary path is
				// the pauseSubscription / resumeSubscription actions.
				const stripeIsPaused = subscription.pause_collection?.behavior === 'mark_uncollectible';
				const dbIsPaused = !!vendorRecord.subscriptionPausedAt;
				if (!stripeIsPaused && dbIsPaused) {
					// Stripe cleared pause_collection but DB still shows paused — mirror clear.
					await db
						.update(vendor)
						.set({ subscriptionPausedAt: null, pauseUntil: null, updatedAt: new Date() })
						.where(eq(vendor.id, vendorRecord.id));
				} else if (stripeIsPaused && !dbIsPaused) {
					// Stripe shows paused but DB doesn't — mirror the pause timestamp.
					await db
						.update(vendor)
						.set({ subscriptionPausedAt: new Date(), updatedAt: new Date() })
						.where(eq(vendor.id, vendorRecord.id));
				}

				// Welcome email on first-payment confirmation via embedded checkout.
				// The subscription was created with payment_behavior: 'default_incomplete';
				// when the vendor confirms payment in the embedded UI, Stripe transitions
				// status incomplete → active and fires this event with previous_attributes
				// containing the prior status. This predicate matches that transition and
				// only that transition — it won't fire on plan/interval switches or add-on
				// changes (in those cases the prior status was already 'active').
				//
				// The 'created' event has no previous_attributes; optional-chain returns
				// undefined and the email is skipped (the sub is created in incomplete state
				// with no payment confirmed yet).
				const prevStatus = (event.data.previous_attributes as { status?: string } | undefined)
					?.status;
				const justActivated = prevStatus === 'incomplete' && subscription.status === 'active';
				const tierForEmail = tierKey ?? vendorRecord.subscriptionTier;
				if (justActivated && vendorRecord.email && tierForEmail && PAID_TIERS.has(tierForEmail)) {
					const item = subscription.items.data[0];
					const amount = item?.price?.unit_amount ?? 0;
					await sendEmail({
						to: vendorRecord.email,
						subject: `You're on Order Local ${tierForEmail.charAt(0).toUpperCase() + tierForEmail.slice(1)}`,
						html: subscriptionConfirmedEmail({
							tenantName: vendorRecord.name,
							planName: tierForEmail.charAt(0).toUpperCase() + tierForEmail.slice(1),
							amount: formatAmount(amount)
						})
					}).catch(console.error);
				}
				await recordSystemEvent('webhook.subscription_updated', 'ok', vendorRecord.id, {
					stripeEventId: event.id,
					status,
					tierKey: tierKey ?? null
				});
				break;
			}

			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;
				const customerId =
					typeof subscription.customer === 'string'
						? subscription.customer
						: subscription.customer.id;

				const vendorRecord = await db.query.vendor.findFirst({
					where: eq(vendor.stripeCustomerId, customerId),
					columns: { id: true }
				});
				if (!vendorRecord) break;

				await db
					.update(vendor)
					.set({
						subscriptionTier: 'starter',
						// Status reflects the current vendor state, not the prior subscription's
						// terminal state. After teardown, the vendor is on free Starter — which
						// is always 'active'. Avoids the "Starter | Cancelled" badge inconsistency.
						subscriptionStatus: 'active',
						subscriptionEndsAt: null,
						stripeSubscriptionId: null,
						addons: [],
						updatedAt: new Date()
					})
					.where(eq(vendor.id, vendorRecord.id));
				await recordSystemEvent('webhook.subscription_deleted', 'ok', vendorRecord.id, {
					stripeEventId: event.id
				});
				break;
			}

			case 'invoice.payment_failed': {
				const invoice = event.data.object as Stripe.Invoice;
				const customerId =
					typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
				if (!customerId) break;

				const vendorRecord = await db.query.vendor.findFirst({
					where: eq(vendor.stripeCustomerId, customerId),
					columns: { id: true, name: true, email: true, subscriptionTier: true }
				});
				if (!vendorRecord) break;

				await db
					.update(vendor)
					.set({ subscriptionStatus: 'past_due', updatedAt: new Date() })
					.where(eq(vendor.id, vendorRecord.id));

				if (vendorRecord.email) {
					const amount = invoice.amount_due ?? 0;
					const nextRetry = (invoice as Stripe.Invoice & { next_payment_attempt?: number })
						.next_payment_attempt;
					const planName =
						(vendorRecord.subscriptionTier ?? 'plan').charAt(0).toUpperCase() +
						(vendorRecord.subscriptionTier ?? 'plan').slice(1);

					await sendEmail({
						to: vendorRecord.email,
						subject: 'Order Local — payment failed',
						html: paymentFailedEmail({
							tenantName: vendorRecord.name,
							planName,
							amount: formatAmount(amount),
							nextRetryDate: nextRetry ? formatDate(nextRetry) : undefined
						})
					}).catch(console.error);
				}
				await recordSystemEvent('webhook.payment_failed', 'ok', vendorRecord.id, {
					stripeEventId: event.id,
					amountDue: invoice.amount_due ?? 0
				});
				break;
			}
		}
	} catch (err) {
		console.error('Billing webhook error:', err);
		await recordSystemEvent('webhook.error', 'error', null, {
			stripeEventId: event.id,
			eventType: event.type,
			error: err instanceof Error ? err.message : String(err)
		});
		throw error(500, 'Webhook processing failed');
	}

	return json({ received: true });
};
