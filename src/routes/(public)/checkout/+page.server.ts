import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { orders } from '$lib/server/db/orders';
import Stripe from 'stripe';

export const load: PageServerLoad = async ({ url, locals }) => {
	const orderIdParam = url.searchParams.get('orderId');
	if (!orderIdParam) throw error(400, 'Missing order ID');

	const orderId = parseInt(orderIdParam);
	if (isNaN(orderId)) throw error(400, 'Invalid order ID');

	const vendorRecord = locals.vendor;
	if (!vendorRecord?.stripeSecretKey) throw error(400, 'Stripe not configured for this store');
	if (!vendorRecord?.stripePublishableKey)
		throw error(400, 'Stripe publishable key not configured. Add it in Integrations settings.');

	const order = await db.query.orders.findFirst({
		where: and(eq(orders.id, orderId), eq(orders.vendorId, vendorRecord.id))
	});
	if (!order) throw error(404, 'Order not found');

	const stripe = new Stripe(vendorRecord.stripeSecretKey);

	let clientSecret: string;
	let intentType: 'payment' | 'setup';

	if (order.stripeSetupIntentId) {
		// Custom-date order: retrieve the SetupIntent
		const setupIntent = await stripe.setupIntents.retrieve(order.stripeSetupIntentId);
		if (!setupIntent.client_secret) throw error(500, 'Could not retrieve payment setup details');
		clientSecret = setupIntent.client_secret;
		intentType = 'setup';
	} else if (order.stripePaymentIntentId) {
		// Windowed one-time order: retrieve the PaymentIntent
		const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
		if (!paymentIntent.client_secret) throw error(500, 'Could not retrieve payment details');
		clientSecret = paymentIntent.client_secret;
		intentType = 'payment';
	} else {
		throw error(400, 'Payment not initialized for this order');
	}

	// Create a Customer Session so the PaymentElement can redisplay saved cards.
	// Required for PMs in any allow_redisplay state — including 'unspecified' (legacy
	// PMs created before Customer Sessions were wired up). Failure is non-blocking:
	// Elements works without it, just won't show saved-card options.
	let customerSessionClientSecret: string | null = null;
	if (order.stripeCustomerId) {
		try {
			const session = await stripe.customerSessions.create({
				customer: order.stripeCustomerId,
				components: {
					payment_element: {
						enabled: true,
						features: {
							payment_method_redisplay: 'enabled',
							payment_method_allow_redisplay_filters: ['always', 'limited', 'unspecified']
						}
					}
				}
			});
			customerSessionClientSecret = session.client_secret;
		} catch (err) {
			console.error('[checkout] customer session create failed:', err);
		}
	}

	return {
		order: {
			id: order.id,
			orderNumber: order.orderNumber,
			customerName: order.customerName,
			customerEmail: order.customerEmail,
			items: order.items as import('$lib/cart.svelte').CartItem[],
			subtotal: order.subtotal,
			tax: order.tax,
			tip: order.tip ?? 0,
			discount: order.discount ?? 0,
			total: order.total,
			type: order.type,
			notes: order.notes,
			paymentStatus: order.paymentStatus
		},
		clientSecret,
		intentType,
		publishableKey: vendorRecord.stripePublishableKey,
		customerSessionClientSecret
	};
};
