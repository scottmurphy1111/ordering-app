import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { orders, orderItems } from '$lib/server/db/orders';
import type { CartItem } from '$lib/cart.svelte';
import { validateCartItems } from '$lib/server/cart/validate';
import { generateOrderNumber } from '$lib/server/order-number';
import { computeMaxLeadDays } from '$lib/utils/lead-days';

function itemUnitPrice(item: CartItem): number {
	return (
		item.basePrice +
		item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment * (m.quantity ?? 1), 0)
	);
}

// Mirrors wallClockToUtc in expand.ts — converts YYYY-MM-DD to noon UTC in the vendor's timezone.
function scheduledDateToNoonUtc(dateStr: string, ianaTimezone: string): Date {
	const [year, month, day] = dateStr.split('-').map(Number);
	const approxUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
	const parts = new Intl.DateTimeFormat('en', {
		timeZone: ianaTimezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).formatToParts(approxUtc);
	const localH = parseInt(parts.find((p) => p.type === 'hour')!.value);
	const localM = parseInt(parts.find((p) => p.type === 'minute')!.value);
	const normH = localH === 24 ? 0 : localH;
	const diffMs = ((12 - normH) * 60 + (0 - localM)) * 60_000;
	return new Date(approxUtc.getTime() + diffMs);
}

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		vendorSlug: string;
		items: CartItem[];
		customer: { name: string; email?: string; phone?: string };
		notes?: string | null;
		scheduledDate: string; // YYYY-MM-DD
		subtotal: number;
		tax: number;
		total: number;
	};

	const { vendorSlug, items, customer, notes, scheduledDate } = body;

	if (!vendorSlug || !items?.length || !customer?.name) {
		throw error(400, 'Missing required fields');
	}

	const vendorRecord = await db.query.vendor.findFirst({ where: eq(vendor.slug, vendorSlug) });
	if (!vendorRecord?.isActive) throw error(404, 'Store not found');
	if (vendorRecord.subscriptionPausedAt)
		throw error(503, 'This store is temporarily not accepting orders');
	if (!vendorRecord.stripeSecretKey) throw error(400, 'Stripe not configured for this store');

	const stripe = new Stripe(vendorRecord.stripeSecretKey);

	// Cart validation — also propagates DB-authoritative customDateLeadDays into validatedItems
	const cartResult = await validateCartItems(items, vendorRecord.id);
	if (!cartResult.valid) {
		return json(
			{
				type: 'cart_validation_failed',
				unavailable: cartResult.unavailable,
				pickupTypeMismatch: cartResult.pickupTypeMismatch
			},
			{ status: 400 }
		);
	}
	const validatedItems = cartResult.validatedItems;

	// All items must be custom_date (defensive — Phase 3 client lock should prevent this)
	const nonCustomDate = validatedItems.filter((i) => i.pickupType !== 'custom_date');
	if (nonCustomDate.length > 0) {
		return json(
			{
				type: 'cart_validation_failed',
				unavailable: [],
				pickupTypeMismatch: {
					firstType: 'custom_date' as const,
					conflictingType: 'windowed' as const
				}
			},
			{ status: 400 }
		);
	}

	// Validate scheduledDate format and range
	if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
		throw error(400, 'Invalid date.');
	}

	const maxLeadDays = computeMaxLeadDays(validatedItems);

	const todayStr = new Date().toISOString().slice(0, 10);
	const [ty, tm, td] = todayStr.split('-').map(Number);
	const minDateStr = new Date(Date.UTC(ty, tm - 1, td + maxLeadDays)).toISOString().slice(0, 10);
	const maxDateStr = new Date(Date.UTC(ty, tm - 1, td + 365)).toISOString().slice(0, 10);

	if (scheduledDate < minDateStr) {
		throw error(400, `Date must be at least ${maxLeadDays} days from today.`);
	}
	if (scheduledDate > maxDateStr) {
		throw error(400, 'Date is too far in the future.');
	}

	// Convert to noon vendor-local UTC timestamp
	const scheduledFor = scheduledDateToNoonUtc(scheduledDate, vendorRecord.timezone);

	// Recompute server-authoritative totals
	const vendorSettings = vendorRecord.settings as { taxRate?: number } | null;
	const taxRate = vendorSettings?.taxRate ?? 0.0825;
	const serverSubtotal = validatedItems.reduce(
		(s, item) => s + itemUnitPrice(item) * item.quantity,
		0
	);
	const serverTax = Math.round(serverSubtotal * taxRate);
	const serverTotal = serverSubtotal + serverTax;

	// Reuse an existing Stripe Customer if one exists for this email + vendor combination.
	// Scoped by vendorId metadata so the same customer email at two different shops
	// creates separate Stripe Customer records (payment methods don't cross shops).
	let stripeCustomer: Stripe.Customer | null = null;
	if (customer.email) {
		// Escape single quotes to prevent Stripe query injection (e.g. O'Brien).
		const escapedEmail = customer.email.replace(/'/g, "\\'");
		try {
			const found = await stripe.customers.search({
				query: `email:'${escapedEmail}' AND metadata['vendorId']:'${String(vendorRecord.id)}'`,
				limit: 1
			});
			stripeCustomer = found.data[0] ?? null;
		} catch (err) {
			// Search is eventually consistent and can fail transiently — fall through to create.
			console.error('[create-setup-intent] stripe.customers.search failed, will create:', err);
		}
	}
	if (!stripeCustomer) {
		stripeCustomer = await stripe.customers.create({
			name: customer.name,
			...(customer.email ? { email: customer.email } : {}),
			phone: customer.phone || undefined,
			metadata: { vendorSlug, vendorId: String(vendorRecord.id) }
		});
	}

	const orderNumber = await generateOrderNumber(vendorRecord.id, db);

	const [newOrder] = await db
		.insert(orders)
		.values({
			vendorId: vendorRecord.id,
			orderNumber,
			customerName: customer.name,
			customerEmail: customer.email || null,
			customerPhone: customer.phone || null,
			type: 'pickup',
			status: 'pending_approval',
			paymentStatus: 'pending',
			pickupType: 'custom_date',
			subtotal: serverSubtotal,
			tax: serverTax,
			tip: 0,
			discount: 0,
			total: serverTotal,
			items: validatedItems,
			notes: notes || null,
			scheduledFor,
			pickupWindowId: null,
			pickupLocationId: null,
			pickupWindowSnapshot: null,
			stripeCustomerId: stripeCustomer.id
		})
		.returning({ id: orders.id, orderNumber: orders.orderNumber });

	await db.insert(orderItems).values(
		validatedItems.map((item) => ({
			orderId: newOrder.id,
			catalogItemId: item.itemId ?? null,
			name: item.name,
			quantity: item.quantity,
			unitPrice: itemUnitPrice(item),
			selectedModifiers: item.selectedModifiers,
			notes: null
		}))
	);

	// Create SetupIntent with usage: 'off_session' so the saved payment method
	// can be charged later without the customer present (Phase 5 approve flow).
	const setupIntent = await stripe.setupIntents.create({
		customer: stripeCustomer.id,
		usage: 'off_session',
		metadata: {
			orderId: String(newOrder.id),
			vendorSlug,
			orderNumber: newOrder.orderNumber
		},
		payment_method_types: ['card']
	});

	await db
		.update(orders)
		.set({ stripeSetupIntentId: setupIntent.id })
		.where(eq(orders.id, newOrder.id));

	return json({ orderId: newOrder.id });
};
