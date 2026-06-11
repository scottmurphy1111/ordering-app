import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { catalogItems } from '$lib/server/db/schema';
import { uploadBufferToR2 } from '$lib/server/r2';

export type DiscoveredItem = {
	stripeProductId: string;
	name: string;
	description: string | null;
	price: number; // cents
	imageUrl: string | null;
	alreadyImported: boolean;
};

const IMPORT_TIERS = new Set(['market', 'pro']);

function requireImportTier(tier: string | null | undefined, isInternal: boolean) {
	if (isInternal) return;
	if (!IMPORT_TIERS.has(tier ?? '')) throw error(403, 'Market or Pro plan required');
}

function toDiscovered(product: Stripe.Product, alreadyImported: boolean): DiscoveredItem | null {
	const defaultPrice = product.default_price as Stripe.Price | null;
	if (!defaultPrice || defaultPrice.type !== 'one_time' || defaultPrice.unit_amount === null) {
		return null;
	}
	return {
		stripeProductId: product.id,
		name: product.name,
		description: product.description,
		price: defaultPrice.unit_amount,
		imageUrl: product.images?.[0] ?? null,
		alreadyImported
	};
}

async function listStripeProducts(stripe: Stripe): Promise<Stripe.Product[]> {
	const products: Stripe.Product[] = [];
	for await (const product of stripe.products.list({
		active: true,
		limit: 100,
		expand: ['data.default_price']
	})) {
		products.push(product);
	}
	return products;
}

// Existing items the importer cares about for dedupe: correlate by stored Stripe ID
// first, then fall back to name (covers items created before the ID was tracked).
async function loadExistingKeys(vendorId: number) {
	const existing = await db.query.catalogItems.findMany({
		where: eq(catalogItems.vendorId, vendorId),
		columns: { name: true, stripeObjectId: true }
	});
	const names = new Set(existing.map((i) => i.name.toLowerCase()));
	const stripeIds = new Set(
		existing.map((i) => i.stripeObjectId).filter((id): id is string => !!id)
	);
	return { names, stripeIds };
}

async function copyImageToR2(
	imageUrl: string,
	slug: string,
	vendorId: number
): Promise<string | null> {
	try {
		const res = await fetch(imageUrl);
		if (!res.ok) return null;
		const contentType = res.headers.get('content-type') ?? 'image/jpeg';
		if (!contentType.startsWith('image/')) return null;
		const buffer = Buffer.from(await res.arrayBuffer());
		const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg';
		return await uploadBufferToR2(
			buffer,
			`${slug}/catalog-items/item-${vendorId}`,
			extension,
			contentType
		);
	} catch (err) {
		console.error('[discover-stripe-items] image copy failed:', err);
		return null;
	}
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const vendorId = locals.vendorId;
	if (!vendorId) throw error(400, 'No vendor selected');

	const record = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: { stripeSecretKey: true, subscriptionTier: true }
	});
	requireImportTier(record?.subscriptionTier, locals.user.isInternal ?? false);

	if (!record?.stripeSecretKey) {
		throw error(
			400,
			'No Stripe key connected. Go to Settings → Integrations to connect your Stripe account.'
		);
	}

	const stripe = new Stripe(record.stripeSecretKey);

	let products: Stripe.Product[];
	try {
		products = await listStripeProducts(stripe);
	} catch (err) {
		console.error('[discover-stripe-items] Stripe list failed:', err);
		throw error(
			502,
			'Could not reach Stripe. Check that your connected Stripe key is still valid.'
		);
	}

	const { names, stripeIds } = await loadExistingKeys(vendorId);

	const discovered: DiscoveredItem[] = [];
	for (const product of products) {
		const already = stripeIds.has(product.id) || names.has(product.name.toLowerCase());
		const item = toDiscovered(product, already);
		if (item) discovered.push(item);
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
		columns: { stripeSecretKey: true, subscriptionTier: true, slug: true }
	});
	requireImportTier(record?.subscriptionTier, locals.user.isInternal ?? false);
	if (!record?.stripeSecretKey) throw error(400, 'No Stripe key connected');
	if (!record.slug) throw error(400, 'Vendor has no storefront slug');

	const body = (await request.json()) as { productIds?: unknown };
	const productIds = Array.isArray(body.productIds)
		? body.productIds.filter((id): id is string => typeof id === 'string')
		: [];
	if (productIds.length === 0) throw error(400, 'No products selected');
	if (productIds.length > 200) throw error(400, 'Too many products (max 200 per import)');

	const stripe = new Stripe(record.stripeSecretKey);

	// Re-fetch authoritative product data from Stripe — never trust client-sent
	// name/price/image. List once, then pick the selected IDs out of the result.
	let productMap: Map<string, Stripe.Product>;
	try {
		const products = await listStripeProducts(stripe);
		productMap = new Map(products.map((p) => [p.id, p]));
	} catch (err) {
		console.error('[discover-stripe-items] Stripe list failed:', err);
		throw error(
			502,
			'Could not reach Stripe. Check that your connected Stripe key is still valid.'
		);
	}

	const { names, stripeIds } = await loadExistingKeys(vendorId);

	const seenNames = new Set<string>();
	let imported = 0;
	let skipped = 0;

	for (const id of productIds) {
		const product = productMap.get(id);
		const item = product ? toDiscovered(product, false) : null;
		if (!item) {
			skipped++;
			continue;
		}
		const nameKey = item.name.toLowerCase();
		// Dedupe by Stripe ID first, then by name (existing or within this batch).
		if (stripeIds.has(item.stripeProductId) || names.has(nameKey) || seenNames.has(nameKey)) {
			skipped++;
			continue;
		}
		seenNames.add(nameKey);

		const r2Url = item.imageUrl ? await copyImageToR2(item.imageUrl, record.slug, vendorId) : null;

		await db.insert(catalogItems).values({
			vendorId,
			name: item.name,
			description: item.description,
			price: item.price,
			images: r2Url ? [{ url: r2Url, isPrimary: true }] : [],
			stripeObjectId: item.stripeProductId,
			status: 'available' as const
		});
		imported++;
	}

	return json({ imported, skipped });
};
