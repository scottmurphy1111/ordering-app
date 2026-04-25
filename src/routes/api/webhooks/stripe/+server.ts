import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { orders } from '$lib/server/db/schema';
import { loyaltyAccounts } from '$lib/server/db/loyalty';
import { tenant } from '$lib/server/db/tenant';
import { DEFAULT_LOYALTY_CONFIG } from '$lib/server/db/loyalty';
import type { LoyaltyConfig } from '$lib/server/db/loyalty';

function getStripe() {
	if (!env.STRIPE_SECRET_KEY) throw error(500, 'STRIPE_SECRET_KEY not set');
	return new Stripe(env.STRIPE_SECRET_KEY);
}

export const POST: RequestHandler = async ({ request }) => {
	const stripe = getStripe();

	if (!env.STRIPE_WEBHOOK_SECRET) throw error(500, 'STRIPE_WEBHOOK_SECRET not set');

	// Read raw body — must be text, not parsed, for signature verification
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) throw error(400, 'Missing stripe-signature header');

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
		throw error(400, 'Invalid webhook signature');
	}

	try {
		await handleEvent(event);
	} catch (err) {
		console.error(`Error handling webhook event ${event.type}:`, err);
		throw error(500, 'Webhook handler failed');
	}

	return json({ received: true });
};

async function handleEvent(event: Stripe.Event) {
	switch (event.type) {
		case 'payment_intent.succeeded': {
			const intent = event.data.object as Stripe.PaymentIntent;
			await db
				.update(orders)
				.set({
					paymentStatus: 'paid',
					status: 'confirmed',
					updatedAt: new Date()
				})
				.where(eq(orders.stripePaymentIntentId, intent.id));
			console.log(`Order confirmed for PaymentIntent ${intent.id}`);
			break;
		}

		case 'payment_intent.payment_failed': {
			const intent = event.data.object as Stripe.PaymentIntent;
			await db
				.update(orders)
				.set({
					paymentStatus: 'failed',
					status: 'cancelled',
					updatedAt: new Date()
				})
				.where(eq(orders.stripePaymentIntentId, intent.id));
			console.log(`Payment failed for PaymentIntent ${intent.id}`);
			break;
		}

		case 'payment_intent.canceled': {
			const intent = event.data.object as Stripe.PaymentIntent;
			await db
				.update(orders)
				.set({
					paymentStatus: 'failed',
					status: 'cancelled',
					updatedAt: new Date()
				})
				.where(eq(orders.stripePaymentIntentId, intent.id));
			break;
		}

		case 'charge.refunded': {
			const charge = event.data.object as Stripe.Charge;
			if (!charge.payment_intent) break;
			const intentId =
				typeof charge.payment_intent === 'string'
					? charge.payment_intent
					: charge.payment_intent.id;
			await db
				.update(orders)
				.set({
					paymentStatus: 'refunded',
					updatedAt: new Date()
				})
				.where(eq(orders.stripePaymentIntentId, intentId));
			console.log(`Order refunded for charge ${charge.id}`);
			break;
		}

		// Primary path: match by metadata.orderId stored when session was created
		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session;
			const orderId = session.metadata?.orderId ? parseInt(session.metadata.orderId) : null;
			const intentId = session.payment_intent
				? typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent.id
				: null;

			if (orderId) {
				await db
					.update(orders)
					.set({
						paymentStatus: 'paid',
						status: 'confirmed',
						...(intentId ? { stripePaymentIntentId: intentId } : {}),
						updatedAt: new Date()
					})
					.where(eq(orders.id, orderId));

				// Award loyalty — look up the order to get tenantId, email, and total
				const order = await db.query.orders.findFirst({
					where: eq(orders.id, orderId),
					columns: { tenantId: true, customerEmail: true, customerName: true, total: true }
				});
				if (order?.customerEmail) {
					await awardLoyalty(order.tenantId, order.customerEmail, order.customerName, order.total);
				}
			} else if (intentId) {
				await db
					.update(orders)
					.set({ paymentStatus: 'paid', status: 'confirmed', updatedAt: new Date() })
					.where(eq(orders.stripePaymentIntentId, intentId));

				const order = await db.query.orders.findFirst({
					where: eq(orders.stripePaymentIntentId, intentId),
					columns: { tenantId: true, customerEmail: true, customerName: true, total: true }
				});
				if (order?.customerEmail) {
					await awardLoyalty(order.tenantId, order.customerEmail, order.customerName, order.total);
				}
			}
			break;
		}

		// These fire as part of a normal Checkout/PaymentIntent flow — no action needed
		case 'product.created':
		case 'product.updated':
		case 'price.created':
		case 'price.updated':
		case 'payment_intent.created':
		case 'charge.succeeded':
		case 'charge.updated':
			break;

		default:
			console.log(`Unhandled Stripe webhook event: ${event.type}`);
	}
}

async function awardLoyalty(
	tenantId: number,
	email: string,
	name: string | null,
	totalCents: number
) {
	const tenantRecord = await db.query.tenant.findFirst({
		where: eq(tenant.id, tenantId),
		columns: { addons: true, settings: true }
	});

	const { hasAddon } = await import('$lib/billing');
	if (!hasAddon(tenantRecord?.addons as string[] | null, 'loyalty')) return;

	const settings = tenantRecord?.settings as Record<string, unknown> | null;
	const loyalty: LoyaltyConfig = (settings?.loyalty as LoyaltyConfig) ?? DEFAULT_LOYALTY_CONFIG;
	if (!loyalty.enabled) return;

	const existing = await db.query.loyaltyAccounts.findFirst({
		where: and(eq(loyaltyAccounts.tenantId, tenantId), eq(loyaltyAccounts.email, email))
	});

	const now = new Date();

	if (loyalty.type === 'stamps') {
		const stamps = loyalty.stamps.stampsPerOrder ?? 1;
		const newTotal = (existing?.totalStampsEarned ?? 0) + stamps;
		const rewardAt = loyalty.stamps.rewardAt ?? 10;
		const prevCurrent = existing?.currentStamps ?? 0;
		const newCurrent = prevCurrent + stamps;
		const rewardsEarned = Math.floor(newCurrent / rewardAt) - Math.floor(prevCurrent / rewardAt);

		if (existing) {
			await db
				.update(loyaltyAccounts)
				.set({
					name: name ?? existing.name,
					currentStamps: newCurrent % rewardAt === 0 ? 0 : newCurrent % rewardAt,
					totalStampsEarned: newTotal,
					totalRewardsEarned: existing.totalRewardsEarned + rewardsEarned,
					lastOrderAt: now,
					updatedAt: now
				})
				.where(and(eq(loyaltyAccounts.tenantId, tenantId), eq(loyaltyAccounts.email, email)));
		} else {
			await db.insert(loyaltyAccounts).values({
				tenantId,
				email,
				name,
				currentStamps: stamps % rewardAt,
				totalStampsEarned: stamps,
				currentPoints: 0,
				totalPointsEarned: 0,
				totalRewardsEarned: rewardsEarned,
				lastOrderAt: now
			});
		}
	} else {
		const dollarSpent = Math.floor(totalCents / 100);
		const pointsPerDollar = loyalty.points.pointsPerDollar ?? 1;
		const earned = dollarSpent * pointsPerDollar;
		const redeemAt = loyalty.points.redeemAt ?? 100;
		const prevPoints = existing?.currentPoints ?? 0;
		const newPoints = prevPoints + earned;
		const rewardsEarned =
			Math.floor(newPoints / redeemAt) - Math.floor(prevPoints / redeemAt);

		if (existing) {
			await db
				.update(loyaltyAccounts)
				.set({
					name: name ?? existing.name,
					currentPoints: newPoints,
					totalPointsEarned: existing.totalPointsEarned + earned,
					totalRewardsEarned: existing.totalRewardsEarned + rewardsEarned,
					lastOrderAt: now,
					updatedAt: now
				})
				.where(and(eq(loyaltyAccounts.tenantId, tenantId), eq(loyaltyAccounts.email, email)));
		} else {
			await db.insert(loyaltyAccounts).values({
				tenantId,
				email,
				name,
				currentStamps: 0,
				totalStampsEarned: 0,
				currentPoints: newPoints,
				totalPointsEarned: earned,
				totalRewardsEarned: rewardsEarned,
				lastOrderAt: now
			});
		}
	}
}
