import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { catalogItems } from '$lib/server/db/schema';

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
	const vendorId = locals.vendorId;
	if (!vendorId) throw error(400, 'No vendor selected');

	const record = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: { stripeSecretKey: true }
	});

	if (!record?.stripeSecretKey) {
		throw error(
			400,
			'No Stripe key connected. Go to Settings → Integrations to connect your Stripe account.'
		);
	}

	const stripe = new Stripe(record.stripeSecretKey);

	const products: Stripe.Product[] = [];
	for await (const product of stripe.products.list({
		active: true,
		limit: 100,
		expand: ['data.default_price']
	})) {
		products.push(product);
	}

	const existingItems = await db.query.catalogItems.findMany({
		where: eq(catalogItems.vendorId, vendorId),
		columns: { name: true }
	});
	const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase()));

	const discovered: DiscoveredItem[] = [];

	for (const product of products) {
		const defaultPrice = product.default_price as Stripe.Price | null;

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

	discovered.sort((a, b) => {
		if (a.alreadyImported !== b.alreadyImported) return a.alreadyImported ? 1 : -1;
		return a.name.localeCompare(b.name);
	});

	return json(discovered);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const vendorId = locals.vendorId;
	if (!vendorId) throw error(400, 'No vendor selected');

	const record = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: { stripeSecretKey: true }
	});
	if (!record?.stripeSecretKey) throw error(400, 'No Stripe key connected');

	const body = (await request.json()) as { items: DiscoveredItem[] };
	if (!Array.isArray(body.items) || body.items.length === 0) {
		throw error(400, 'No items provided');
	}

	const existingItems = await db.query.catalogItems.findMany({
		where: eq(catalogItems.vendorId, vendorId),
		columns: { name: true }
	});
	const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase()));

	const toInsert = body.items.filter((i) => !existingNames.has(i.name.toLowerCase()));

	if (toInsert.length > 0) {
		await db.insert(catalogItems).values(
			toInsert.map((item) => ({
				vendorId,
				name: item.name,
				description: item.description,
				price: item.price,
				images: item.imageUrl ? [{ url: item.imageUrl, isPrimary: true }] : [],
				status: 'available' as const
			}))
		);
	}

	return json({ imported: toInsert.length, skipped: body.items.length - toInsert.length });
};
