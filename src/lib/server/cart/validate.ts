import { db } from '$lib/server/db';
import {
	catalogItems,
	catalogItemModifiers,
	modifiers,
	modifierOptions
} from '$lib/server/db/catalog';
import { and, eq, inArray } from 'drizzle-orm';
import type { CartItem, PickupType } from '$lib/cart.svelte';
import { isCompatible } from './compat';

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
			discountedPrice: catalogItems.discountedPrice,
			status: catalogItems.status,
			pickupType: catalogItems.pickupType,
			customDateLeadDays: catalogItems.customDateLeadDays,
			allowStoreHours: catalogItems.allowStoreHours,
			allowPickupEvents: catalogItems.allowPickupEvents,
			allowCustomDate: catalogItems.allowCustomDate
		})
		.from(catalogItems)
		.where(and(inArray(catalogItems.id, itemIds), eq(catalogItems.vendorId, vendorId)));

	const lookup = new Map(rows.map((r) => [r.id, r]));

	// Authoritative modifier options for these items. Price, name, and caps live in the
	// catalog and are NEVER trusted from the client cart. Vendor-scoped via the group join.
	type ValidOption = {
		modifierId: number;
		groupName: string;
		maxSelections: number;
		name: string;
		priceAdjustment: number;
		maxQuantity: number;
	};
	const optionsByItem = new Map<number, Map<number, ValidOption>>();
	if (itemIds.length > 0) {
		const modRows = await db
			.select({
				catalogItemId: catalogItemModifiers.catalogItemId,
				modifierId: modifiers.id,
				groupName: modifiers.name,
				maxSelections: modifiers.maxSelections,
				optionId: modifierOptions.id,
				optionName: modifierOptions.name,
				priceAdjustment: modifierOptions.priceAdjustment,
				maxQuantity: modifierOptions.maxQuantity
			})
			.from(catalogItemModifiers)
			.innerJoin(modifiers, eq(modifiers.id, catalogItemModifiers.modifierId))
			.innerJoin(modifierOptions, eq(modifierOptions.modifierId, modifiers.id))
			.where(
				and(inArray(catalogItemModifiers.catalogItemId, itemIds), eq(modifiers.vendorId, vendorId))
			);
		for (const r of modRows) {
			let m = optionsByItem.get(r.catalogItemId);
			if (!m) {
				m = new Map<number, ValidOption>();
				optionsByItem.set(r.catalogItemId, m);
			}
			m.set(r.optionId, {
				modifierId: r.modifierId,
				groupName: r.groupName,
				maxSelections: r.maxSelections ?? 1,
				name: r.optionName,
				priceAdjustment: r.priceAdjustment ?? 0,
				maxQuantity: r.maxQuantity
			});
		}
	}

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
		// Effective price mirrors the storefront/cart: discountedPrice when set
		// (?? so an intentional 0 is respected), else full retail.
		const effectivePrice = row.discountedPrice ?? row.price;
		if (item.basePrice !== effectivePrice && !seenPriceChangeIds.has(item.itemId)) {
			priceChanges.push({
				itemId: item.itemId,
				name: item.name,
				cartPrice: item.basePrice,
				currentPrice: effectivePrice
			});
			seenPriceChangeIds.add(item.itemId);
		}
		if (
			!isCompatible(
				{
					allowStoreHours: row.allowStoreHours,
					allowPickupEvents: row.allowPickupEvents,
					allowCustomDate: row.allowCustomDate
				},
				pickupMode
			) &&
			!seenMismatchIds.has(item.itemId)
		) {
			availabilityMismatch.push({
				itemId: item.itemId,
				name: item.name
			});
			seenMismatchIds.add(item.itemId);
		}
		// Re-derive modifiers from the catalog: authoritative price/name, quantity clamped to
		// [1, maxQuantity], options not attached to this item dropped, group maxSelections and
		// duplicate optionIds enforced. The charge can only ever reflect real, offered options.
		const validOptions = optionsByItem.get(item.itemId) ?? new Map<number, ValidOption>();
		const distinctByGroup = new Map<number, number>();
		const seenOptionIds = new Set<number>();
		const rebuiltModifiers: CartItem['selectedModifiers'] = [];
		for (const m of item.selectedModifiers) {
			const opt = validOptions.get(m.optionId);
			if (!opt || seenOptionIds.has(m.optionId)) continue;
			const used = distinctByGroup.get(opt.modifierId) ?? 0;
			if (used >= opt.maxSelections) continue;
			const qty = Math.min(Math.max(1, Math.floor(m.quantity ?? 1)), opt.maxQuantity);
			rebuiltModifiers.push({
				modifierId: opt.modifierId,
				optionId: m.optionId,
				group: opt.groupName,
				name: opt.name,
				priceAdjustment: opt.priceAdjustment,
				quantity: qty
			});
			distinctByGroup.set(opt.modifierId, used + 1);
			seenOptionIds.add(m.optionId);
		}
		validatedItems.push({
			...item,
			basePrice: effectivePrice,
			customDateLeadDays: row.customDateLeadDays ?? undefined,
			selectedModifiers: rebuiltModifiers
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
