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

	if (!order.stripePaymentIntentId) throw error(400, 'Payment not initialized for this order');

	const stripe = new Stripe(vendorRecord.stripeSecretKey);
	const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);

	if (!paymentIntent.client_secret) throw error(500, 'Could not retrieve payment details');

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
			deliveryFee: order.deliveryFee ?? 0,
			discount: order.discount ?? 0,
			total: order.total,
			type: order.type,
			notes: order.notes,
			paymentStatus: order.paymentStatus
		},
		clientSecret: paymentIntent.client_secret,
		publishableKey: vendorRecord.stripePublishableKey
	};
};
