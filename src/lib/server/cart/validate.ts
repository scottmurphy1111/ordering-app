import { db } from '$lib/server/db';
import { catalogItems } from '$lib/server/db/catalog';
import { and, eq, inArray } from 'drizzle-orm';
import type { CartItem, PickupType } from '$lib/cart.svelte';
import { isCompatible, type AvailabilityMode } from './compat';

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

export type AvailabilityMismatch = {
	itemId: number;
	name: string;
	mode: AvailabilityMode;
};

export type CartValidationResult =
	| { valid: true; validatedItems: CartItem[]; priceChanges: PriceChange[] }
	| {
			valid: false;
			unavailable: UnavailableItem[];
			priceChanges: PriceChange[];
			pickupTypeMismatch?: { firstType: PickupType; conflictingType: PickupType };
			availabilityMismatch?: AvailabilityMismatch[];
	  };


/**
 * Validates cart items against live catalog state for a vendor.
 * Items with status != 'available' or missing from DB go into `unavailable`.
 * Items with stale basePrice go into `priceChanges`; validatedItems always carry current prices.
 * Items incompatible with the chosen pickupMode go into `availabilityMismatch`.
 * Returns valid:false if any item is unavailable or mismatched.
 * IDOR-safe: queries filter by both id and vendorId.
 */
export async function validateCartItems(
	items: CartItem[],
	vendorId: number,
	pickupMode?: 'pickup_event' | 'storefront_hours' | 'custom_date'
): Promise<CartValidationResult> {
	const itemIds = [...new Set(items.map((i) => i.itemId))];

	const rows = await db
		.select({
			id: catalogItems.id,
			name: catalogItems.name,
			price: catalogItems.price,
			status: catalogItems.status,
			pickupType: catalogItems.pickupType,
			customDateLeadDays: catalogItems.customDateLeadDays,
			availabilityMode: catalogItems.availabilityMode
		})
		.from(catalogItems)
		.where(and(inArray(catalogItems.id, itemIds), eq(catalogItems.vendorId, vendorId)));

	const lookup = new Map(rows.map((r) => [r.id, r]));

	const unavailable: UnavailableItem[] = [];
	const priceChanges: PriceChange[] = [];
	const validatedItems: CartItem[] = [];
	const availabilityMismatch: AvailabilityMismatch[] = [];
	const seenPriceChangeIds = new Set<number>();
	const seenMismatchIds = new Set<number>();

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
		if (!isCompatible(row.availabilityMode, pickupMode) && !seenMismatchIds.has(item.itemId)) {
			availabilityMismatch.push({ itemId: item.itemId, name: item.name, mode: row.availabilityMode });
			seenMismatchIds.add(item.itemId);
		}
		validatedItems.push({
			...item,
			basePrice: row.price,
			customDateLeadDays: row.customDateLeadDays ?? undefined,
			availabilityMode: row.availabilityMode
		});
	}

	if (unavailable.length > 0) {
		return { valid: false, unavailable, priceChanges };
	}

	if (availabilityMismatch.length > 0) {
		return { valid: false, unavailable: [], priceChanges, availabilityMismatch };
	}

	// Pickup-type consistency check. Client-side cart already prevents mixing via CartTypeMismatchError;
	// this catches tampered carts (devtools, replayed requests, stale localStorage).
	if (validatedItems.length > 0) {
		const expectedType = lookup.get(validatedItems[0].itemId)!.pickupType;
		for (const item of validatedItems) {
			const row = lookup.get(item.itemId)!;
			if (row.pickupType !== expectedType) {
				return {
					valid: false,
					unavailable: [],
					priceChanges,
					pickupTypeMismatch: { firstType: expectedType, conflictingType: row.pickupType }
				};
			}
		}
	}

	return { valid: true, validatedItems, priceChanges };
}
