import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { orders } from '$lib/server/db/schema';

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
			} else if (intentId) {
				await db
					.update(orders)
					.set({ paymentStatus: 'paid', status: 'confirmed', updatedAt: new Date() })
					.where(eq(orders.stripePaymentIntentId, intentId));
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
