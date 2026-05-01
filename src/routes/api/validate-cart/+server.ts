import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { validateCartItems } from '$lib/server/cart/validate';
import type { CartItem } from '$lib/cart.svelte';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { vendorSlug: string; items: CartItem[] };

	if (!body.vendorSlug || !body.items?.length) {
		return json({ unavailable: [], priceChanges: [] });
	}

	const vendorRecord = await db.query.vendor.findFirst({
		where: eq(vendor.slug, body.vendorSlug)
	});
	if (!vendorRecord) return json({ unavailable: [], priceChanges: [] });

	const result = await validateCartItems(body.items, vendorRecord.id);

	return json({
		unavailable: result.valid ? [] : result.unavailable,
		priceChanges: result.priceChanges
	});
};
