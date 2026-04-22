import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/tenant';
import { getOrderLocalStripe } from '$lib/server/stripe-billing';
import { sendEmail } from '$lib/server/email';
import { subscriptionConfirmedEmail } from '$lib/server/email/templates/subscriptionConfirmed';
import { paymentFailedEmail } from '$lib/server/email/templates/paymentFailed';

const PAID_TIERS = new Set(['growth', 'pro']);

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
				const tenantId = parseInt(session.metadata?.tenantId ?? '');
				const planKey = session.metadata?.planKey;
				if (isNaN(tenantId) || !planKey || !PAID_TIERS.has(planKey)) break;

				const subscriptionId =
					typeof session.subscription === 'string'
						? session.subscription
						: session.subscription?.id;
				const customerId =
					typeof session.customer === 'string' ? session.customer : session.customer?.id;

				await db
					.update(tenant)
					.set({
						subscriptionTier: planKey,
						subscriptionStatus: 'active',
						stripeSubscriptionId: subscriptionId ?? null,
						stripeCustomerId: customerId ?? null,
						updatedAt: new Date()
					})
					.where(eq(tenant.id, tenantId));

				// Send confirmation email
				const tenantRecord = await db.query.tenant.findFirst({
					where: eq(tenant.id, tenantId),
					columns: { name: true, email: true }
				});

				if (tenantRecord?.email && subscriptionId) {
					const subscription = await stripe.subscriptions.retrieve(subscriptionId);
					const item = subscription.items.data[0];
					const amount = item?.price?.unit_amount ?? 0;

					await sendEmail({
						to: tenantRecord.email,
						subject: `You're on Order Local ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`,
						html: subscriptionConfirmedEmail({
							tenantName: tenantRecord.name,
							planName: planKey.charAt(0).toUpperCase() + planKey.slice(1),
							amount: formatAmount(amount)
						})
					}).catch(console.error);
				}
				break;
			}

			case 'customer.subscription.updated': {
				const subscription = event.data.object as Stripe.Subscription;
				const customerId =
					typeof subscription.customer === 'string'
						? subscription.customer
						: subscription.customer.id;

				const tenantRecord = await db.query.tenant.findFirst({
					where: eq(tenant.stripeCustomerId, customerId),
					columns: { id: true }
				});
				if (!tenantRecord) break;

				const status =
					subscription.status === 'active'
						? 'active'
						: subscription.status === 'past_due'
							? 'past_due'
							: subscription.status === 'canceled'
								? 'cancelled'
								: subscription.status;

				await db
					.update(tenant)
					.set({ subscriptionStatus: status, updatedAt: new Date() })
					.where(eq(tenant.id, tenantRecord.id));
				break;
			}

			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;
				const customerId =
					typeof subscription.customer === 'string'
						? subscription.customer
						: subscription.customer.id;

				const tenantRecord = await db.query.tenant.findFirst({
					where: eq(tenant.stripeCustomerId, customerId),
					columns: { id: true }
				});
				if (!tenantRecord) break;

				// Downgrade to Starter and clear all paid add-ons
				await db
					.update(tenant)
					.set({
						subscriptionTier: 'starter',
						subscriptionStatus: 'cancelled',
						stripeSubscriptionId: null,
						addons: [],
						updatedAt: new Date()
					})
					.where(eq(tenant.id, tenantRecord.id));
				break;
			}

			case 'invoice.payment_failed': {
				const invoice = event.data.object as Stripe.Invoice;
				const customerId =
					typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
				if (!customerId) break;

				const tenantRecord = await db.query.tenant.findFirst({
					where: eq(tenant.stripeCustomerId, customerId),
					columns: { id: true, name: true, email: true, subscriptionTier: true }
				});
				if (!tenantRecord) break;

				await db
					.update(tenant)
					.set({ subscriptionStatus: 'past_due', updatedAt: new Date() })
					.where(eq(tenant.id, tenantRecord.id));

				if (tenantRecord.email) {
					const amount = invoice.amount_due ?? 0;
					const nextRetry = (invoice as Stripe.Invoice & { next_payment_attempt?: number })
						.next_payment_attempt;
					const planName =
						(tenantRecord.subscriptionTier ?? 'plan').charAt(0).toUpperCase() +
						(tenantRecord.subscriptionTier ?? 'plan').slice(1);

					await sendEmail({
						to: tenantRecord.email,
						subject: 'Order Local — payment failed',
						html: paymentFailedEmail({
							tenantName: tenantRecord.name,
							planName,
							amount: formatAmount(amount),
							nextRetryDate: nextRetry ? formatDate(nextRetry) : undefined
						})
					}).catch(console.error);
				}
				break;
			}
		}
	} catch (err) {
		console.error('Billing webhook error:', err);
		throw error(500, 'Webhook processing failed');
	}

	return json({ received: true });
};
