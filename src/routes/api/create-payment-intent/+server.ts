import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { db } from '$lib/server/db';
import { eq, and, sql } from 'drizzle-orm';
import { tenant } from '$lib/server/db/schema';
import { orders, orderItems } from '$lib/server/db/orders';
import { promoCodes } from '$lib/server/db/promos';
import { calcDiscount } from '$lib/server/promo';
import type { CartItem } from '$lib/cart.svelte';

function generateOrderNumber(): string {
	const ts = Date.now().toString(36).toUpperCase();
	const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
	return `#${ts}-${rand}`;
}

function itemUnitPrice(item: CartItem): number {
	return item.basePrice + item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0);
}

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		tenantSlug: string;
		items: CartItem[];
		customer: { name: string; email?: string; phone?: string };
		notes?: string;
		orderType: string;
		deliveryAddress?: string | null;
		scheduledFor?: string | null;
		subtotal: number;
		tax: number;
		tip?: number;
		deliveryFee?: number;
		discount?: number;
		promoCode?: string | null;
		total: number;
	};

	const {
		tenantSlug,
		items,
		customer,
		notes,
		orderType,
		deliveryAddress,
		scheduledFor,
		subtotal,
		tax,
		tip,
		promoCode
	} = body;

	if (!tenantSlug || !items?.length || !customer?.name) {
		throw error(400, 'Missing required fields');
	}

	const tenantRecord = await db.query.tenant.findFirst({ where: eq(tenant.slug, tenantSlug) });
	if (!tenantRecord?.isActive) throw error(404, 'Store not found');
	if (!tenantRecord.stripeSecretKey) throw error(400, 'Stripe not configured for this store');

	const stripe = new Stripe(tenantRecord.stripeSecretKey);

	const tenantSettings = tenantRecord.settings as {
		deliveryFee?: number;
		enableDelivery?: boolean;
	} | null;
	const verifiedDeliveryFee =
		orderType === 'delivery' && tenantSettings?.enableDelivery
			? (tenantSettings.deliveryFee ?? 0)
			: 0;

	let verifiedDiscount = 0;
	let verifiedPromoCode: string | null = null;
	let promoRecord: typeof promoCodes.$inferSelect | null = null;

	if (promoCode) {
		promoRecord =
			(await db.query.promoCodes.findFirst({
				where: and(
					eq(promoCodes.tenantId, tenantRecord.id),
					eq(promoCodes.code, promoCode.toUpperCase())
				)
			})) ?? null;

		const now = new Date();
		const valid =
			promoRecord &&
			promoRecord.isActive &&
			(!promoRecord.expiresAt || now <= promoRecord.expiresAt) &&
			(promoRecord.maxUses === null || promoRecord.usedCount < promoRecord.maxUses) &&
			subtotal >= promoRecord.minOrderAmount;

		if (valid && promoRecord) {
			verifiedDiscount = calcDiscount(promoRecord.type, promoRecord.amount, subtotal);
			verifiedPromoCode = promoRecord.code;
		}
	}

	const verifiedTotal = Math.max(
		0,
		subtotal + tax + (tip ?? 0) + verifiedDeliveryFee - verifiedDiscount
	);

	const orderNumber = generateOrderNumber();

	const [newOrder] = await db
		.insert(orders)
		.values({
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
			deliveryFee: verifiedDeliveryFee,
			tip: tip ?? 0,
			discount: verifiedDiscount,
			promoCode: verifiedPromoCode,
			total: verifiedTotal,
			items: items,
			deliveryAddress: deliveryAddress || null,
			notes: notes || null,
			scheduledFor: scheduledFor ? new Date(scheduledFor) : null
		})
		.returning({ id: orders.id });

	await db.insert(orderItems).values(
		items.map((item) => ({
			orderId: newOrder.id,
			menuItemId: item.itemId ?? null,
			name: item.name,
			quantity: item.quantity,
			unitPrice: itemUnitPrice(item),
			selectedModifiers: item.selectedModifiers,
			notes: null
		}))
	);

	const paymentIntent = await stripe.paymentIntents.create({
		amount: verifiedTotal,
		currency: 'usd',
		...(customer.email ? { receipt_email: customer.email } : {}),
		metadata: {
			orderId: String(newOrder.id),
			tenantSlug,
			orderNumber
		}
	});

	await db
		.update(orders)
		.set({ stripePaymentIntentId: paymentIntent.id })
		.where(eq(orders.id, newOrder.id));

	if (promoRecord) {
		await db
			.update(promoCodes)
			.set({ usedCount: sql`${promoCodes.usedCount} + 1` })
			.where(eq(promoCodes.id, promoRecord.id));
	}

	return json({ orderId: newOrder.id });
};
