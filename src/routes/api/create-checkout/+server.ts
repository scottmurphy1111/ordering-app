import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/schema';
import { orders, orderItems } from '$lib/server/db/orders';
import type { CartItem } from '$lib/cart.svelte';

function getStripe() {
	if (!env.STRIPE_SECRET_KEY) throw error(500, 'STRIPE_SECRET_KEY not set');
	return new Stripe(env.STRIPE_SECRET_KEY);
}

function generateOrderNumber(): string {
	const ts = Date.now().toString(36).toUpperCase();
	const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
	return `#${ts}-${rand}`;
}

function itemUnitPrice(item: CartItem): number {
	return item.basePrice + item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0);
}

export const POST: RequestHandler = async ({ request }) => {
	const stripe = getStripe();
	const origin = env.ORIGIN;

	const body = await request.json() as {
		tenantSlug: string;
		items: CartItem[];
		customer: { name: string; email?: string; phone?: string };
		notes?: string;
		orderType: string;
		subtotal: number;
		tax: number;
		total: number;
	};

	const { tenantSlug, items, customer, notes, orderType, subtotal, tax, total } = body;

	if (!tenantSlug || !items?.length || !customer?.name) {
		throw error(400, 'Missing required fields');
	}

	// Resolve tenant
	const tenantRecord = await db.query.tenant.findFirst({ where: eq(tenant.slug, tenantSlug) });
	if (!tenantRecord?.isActive) throw error(404, 'Store not found');

	// Create order in DB (payment_status = pending until webhook confirms)
	const orderNumber = generateOrderNumber();

	const [newOrder] = await db.insert(orders).values({
		tenantId: tenantRecord.id,
		orderNumber,
		customerName: customer.name,
		customerEmail: customer.email || null,
		customerPhone: customer.phone || null,
		type: orderType,
		status: 'received',
		paymentStatus: 'pending',
		subtotal,
		tax,
		deliveryFee: 0,
		tip: 0,
		total,
		items: items, // denormalised snapshot
		notes: notes || null
	}).returning({ id: orders.id });

	// Also insert normalised order items
	await db.insert(orderItems).values(
		items.map((item) => ({
			orderId: newOrder.id,
			name: item.name,
			quantity: item.quantity,
			unitPrice: itemUnitPrice(item),
			selectedModifiers: item.selectedModifiers,
			notes: null
		}))
	);

	// Build Stripe line items
	const lineItems = items.map((item) => ({
		quantity: item.quantity,
		price_data: {
			currency: 'usd',
			unit_amount: itemUnitPrice(item),
			product_data: {
				name: item.selectedModifiers.length
					? `${item.name} (${item.selectedModifiers.map((m) => m.name).join(', ')})`
					: item.name
			}
		}
	}));

	// Add tax as its own line item so it's visible on the Stripe receipt
	if (tax > 0) {
		lineItems.push({
			quantity: 1,
			price_data: {
				currency: 'usd',
				unit_amount: tax,
				product_data: { name: 'Tax' }
			}
		});
	}

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		line_items: lineItems,
		...(customer.email ? { customer_email: customer.email } : {}),
		success_url: `${origin}/${tenantSlug}/orders/${newOrder.id}?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/${tenantSlug}/cart`,
		metadata: {
			orderId: String(newOrder.id),
			tenantSlug
		}
	});

	// session.payment_intent is the PI ID (pi_...) for payment-mode sessions.
	// Fall back to the session ID only if somehow absent — the refund action
	// knows how to resolve a cs_... ID back to a PI via the Sessions API.
	const paymentIntentId = (typeof session.payment_intent === 'string'
		? session.payment_intent
		: session.payment_intent?.id) ?? session.id;

	await db.update(orders)
		.set({ stripePaymentIntentId: paymentIntentId, metadata: { stripeSessionId: session.id } })
		.where(eq(orders.id, newOrder.id));

	return json({ url: session.url });
};
