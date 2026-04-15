import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/tenant';
import { menuItems } from '$lib/server/db/schema';

export type DiscoveredItem = {
	stripeProductId: string;
	name: string;
	description: string | null;
	price: number; // cents
	imageUrl: string | null;
	alreadyImported: boolean;
};

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const tenantId = locals.tenantId;
	if (!tenantId) throw error(400, 'No tenant selected');

	const record = await db.query.tenant.findFirst({
		where: eq(tenant.id, tenantId),
		columns: { stripeSecretKey: true }
	});

	if (!record?.stripeSecretKey) {
		throw error(400, 'No Stripe key connected. Go to Settings → Integrations to connect your Stripe account.');
	}

	const stripe = new Stripe(record.stripeSecretKey);

	// Fetch all active products with their default prices, auto-paginating
	const products: Stripe.Product[] = [];
	for await (const product of stripe.products.list({ active: true, limit: 100, expand: ['data.default_price'] })) {
		products.push(product);
	}

	// Get existing menu item names to flag already-imported ones
	const existingItems = await db.query.menuItems.findMany({
		where: eq(menuItems.tenantId, tenantId),
		columns: { name: true }
	});
	const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase()));

	const discovered: DiscoveredItem[] = [];

	for (const product of products) {
		const defaultPrice = product.default_price as Stripe.Price | null;

		// Only include products with a one-time price in unit_amount
		if (!defaultPrice || defaultPrice.type !== 'one_time' || defaultPrice.unit_amount === null) {
			continue;
		}

		discovered.push({
			stripeProductId: product.id,
			name: product.name,
			description: product.description,
			price: defaultPrice.unit_amount,
			imageUrl: product.images?.[0] ?? null,
			alreadyImported: existingNames.has(product.name.toLowerCase())
		});
	}

	// Sort: not-yet-imported first, then alphabetically
	discovered.sort((a, b) => {
		if (a.alreadyImported !== b.alreadyImported) return a.alreadyImported ? 1 : -1;
		return a.name.localeCompare(b.name);
	});

	return json(discovered);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const tenantId = locals.tenantId;
	if (!tenantId) throw error(400, 'No tenant selected');

	const record = await db.query.tenant.findFirst({
		where: eq(tenant.id, tenantId),
		columns: { stripeSecretKey: true }
	});
	if (!record?.stripeSecretKey) throw error(400, 'No Stripe key connected');

	const body = await request.json() as { items: DiscoveredItem[] };
	if (!Array.isArray(body.items) || body.items.length === 0) {
		throw error(400, 'No items provided');
	}

	// Get existing names to avoid duplicates
	const existingItems = await db.query.menuItems.findMany({
		where: eq(menuItems.tenantId, tenantId),
		columns: { name: true }
	});
	const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase()));

	const toInsert = body.items.filter((i) => !existingNames.has(i.name.toLowerCase()));

	if (toInsert.length > 0) {
		await db.insert(menuItems).values(
			toInsert.map((item) => ({
				tenantId,
				name: item.name,
				description: item.description,
				price: item.price,
				images: item.imageUrl ? [{ url: item.imageUrl, isPrimary: true }] : [],
				available: true
			}))
		);
	}

	return json({ imported: toInsert.length, skipped: body.items.length - toInsert.length });
};
