import { db } from '$lib/server/db';
import { catalogItems } from '$lib/server/db/catalog';
import { and, eq, inArray } from 'drizzle-orm';
import type { CartItem } from '$lib/cart.svelte';

export type UnavailableItem = {
	itemId: number;
	name: string;
};

export type PriceChange = {
	itemId: number;
	name: string;
	cartPrice: number;
	currentPrice: number;
};

export type CartValidationResult =
	| { valid: true; validatedItems: CartItem[]; priceChanges: PriceChange[] }
	| { valid: false; unavailable: UnavailableItem[]; priceChanges: PriceChange[] };

/**
 * Validates cart items against live catalog state for a vendor.
 * Items with status != 'available' or missing from DB go into `unavailable`.
 * Items with stale basePrice go into `priceChanges`; validatedItems always carry current prices.
 * Returns valid:false if any item is unavailable.
 * IDOR-safe: queries filter by both id and vendorId.
 */
export async function validateCartItems(
	items: CartItem[],
	vendorId: number
): Promise<CartValidationResult> {
	const itemIds = [...new Set(items.map((i) => i.itemId))];

	const rows = await db
		.select({
			id: catalogItems.id,
			name: catalogItems.name,
			price: catalogItems.price,
			status: catalogItems.status
		})
		.from(catalogItems)
		.where(and(inArray(catalogItems.id, itemIds), eq(catalogItems.vendorId, vendorId)));

	const lookup = new Map(rows.map((r) => [r.id, r]));

	const unavailable: UnavailableItem[] = [];
	const priceChanges: PriceChange[] = [];
	const validatedItems: CartItem[] = [];
	const seenPriceChangeIds = new Set<number>();

	for (const item of items) {
		const row = lookup.get(item.itemId);
		if (!row || row.status !== 'available') {
			unavailable.push({ itemId: item.itemId, name: item.name });
			continue;
		}
		if (item.basePrice !== row.price && !seenPriceChangeIds.has(item.itemId)) {
			priceChanges.push({
				itemId: item.itemId,
				name: item.name,
				cartPrice: item.basePrice,
				currentPrice: row.price
			});
			seenPriceChangeIds.add(item.itemId);
		}
		validatedItems.push({ ...item, basePrice: row.price });
	}

	if (unavailable.length > 0) {
		return { valid: false, unavailable, priceChanges };
	}
	return { valid: true, validatedItems, priceChanges };
}
