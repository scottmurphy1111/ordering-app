import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { orders } from '$lib/server/db/orders';
import { specialOrderPayments } from '$lib/server/db/special-orders';
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
	// The amount Stripe will actually charge now (the PI amount) — equals
	// order.total for a normal order, but is the deposit for a deposit order.
	// Null for the setup-intent branch (no charge now); UI falls back to total.
	let amountDueNowCents: number | null = null;
	// True when the active PI already succeeded (or the order is fully paid) — the
	// page must NOT mount Elements on a terminal intent (it hangs on the skeleton).
	let alreadyPaid = false;

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
		amountDueNowCents = paymentIntent.amount;
		alreadyPaid = paymentIntent.status === 'succeeded' || order.paymentStatus === 'paid';
	} else {
		throw error(400, 'Payment not initialized for this order');
	}

	// Deposit/balance split for special orders. Present only when both a Deposit
	// and a Balance installment exist; null for normal and no-deposit orders.
	const paymentRows = await db
		.select()
		.from(specialOrderPayments)
		.where(eq(specialOrderPayments.orderId, orderId))
		.orderBy(specialOrderPayments.id);
	const depositPayment = paymentRows.find((p) => p.label === 'Deposit');
	const balancePayment = paymentRows.find((p) => p.label === 'Balance');
	const deposit =
		depositPayment && balancePayment
			? {
					depositCents: depositPayment.amountCents,
					balanceCents: balancePayment.amountCents,
					balanceDueAt: balancePayment.dueAt
				}
			: null;

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
		amountDueNowCents,
		alreadyPaid,
		deposit,
		publishableKey: vendorRecord.stripePublishableKey,
		customerSessionClientSecret
	};
};
