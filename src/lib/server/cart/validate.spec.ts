import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isCompatible } from './compat';

// Mock the DB so validateCartItems uses rows we control (no real connection).
const { mockState } = vi.hoisted(() => ({
	mockState: { rows: [] as Array<Record<string, unknown>> }
}));
vi.mock('$lib/server/db', () => ({
	db: {
		select: () => ({ from: () => ({ where: () => Promise.resolve(mockState.rows) }) })
	}
}));

import { validateCartItems } from './validate';
import type { CartItem } from '$lib/cart.svelte';

function row(over: Record<string, unknown> = {}) {
	return {
		id: 1,
		name: 'Sale item',
		price: 1000,
		discountedPrice: null,
		status: 'available',
		pickupType: 'windowed',
		customDateLeadDays: null,
		availabilityMode: 'always',
		...over
	};
}

function cartItem(over: Partial<CartItem> = {}): CartItem {
	return {
		itemId: 1,
		name: 'Sale item',
		basePrice: 1000,
		quantity: 1,
		selectedModifiers: [],
		...over
	} as CartItem;
}

describe('isCompatible — availability mode vs pickup mode', () => {
	it('always is compatible with pickup_event', () => {
		expect(isCompatible('always', 'pickup_event')).toBe(true);
	});

	it('always is compatible with storefront_hours', () => {
		expect(isCompatible('always', 'storefront_hours')).toBe(true);
	});

	it('storefront_only is incompatible with pickup_event', () => {
		expect(isCompatible('storefront_only', 'pickup_event')).toBe(false);
	});

	it('storefront_only is compatible with storefront_hours', () => {
		expect(isCompatible('storefront_only', 'storefront_hours')).toBe(true);
	});

	it('events_only is incompatible with storefront_hours', () => {
		expect(isCompatible('events_only', 'storefront_hours')).toBe(false);
	});

	it('events_only is compatible with pickup_event', () => {
		expect(isCompatible('events_only', 'pickup_event')).toBe(true);
	});

	it('unlisted is compatible with any mode (hidden from catalog, link-orderable)', () => {
		expect(isCompatible('unlisted', 'pickup_event')).toBe(true);
		expect(isCompatible('unlisted', 'storefront_hours')).toBe(true);
	});

	it('any mode is compatible when pickupMode is undefined', () => {
		expect(isCompatible('storefront_only', undefined)).toBe(true);
		expect(isCompatible('events_only', undefined)).toBe(true);
	});
});

describe('validateCartItems — effective (discounted) price', () => {
	beforeEach(() => {
		mockState.rows = [];
	});

	it('discounted item added at its sale price → no price change, validated at sale price', async () => {
		mockState.rows = [row({ price: 1000, discountedPrice: 800 })];
		const result = await validateCartItems([cartItem({ basePrice: 800 })], 1);
		expect(result.priceChanges).toHaveLength(0);
		expect(result.valid).toBe(true);
		if (result.valid) expect(result.validatedItems[0].basePrice).toBe(800);
	});

	it('discounted item still carrying full retail (stale) → one change, currentPrice = discounted', async () => {
		mockState.rows = [row({ price: 1000, discountedPrice: 800 })];
		const result = await validateCartItems([cartItem({ basePrice: 1000 })], 1);
		expect(result.priceChanges).toHaveLength(1);
		expect(result.priceChanges[0].currentPrice).toBe(800);
		if (result.valid) expect(result.validatedItems[0].basePrice).toBe(800);
	});

	it('non-discounted item (discountedPrice null) → compares against full price as before', async () => {
		mockState.rows = [row({ price: 1000, discountedPrice: null })];
		const ok = await validateCartItems([cartItem({ basePrice: 1000 })], 1);
		expect(ok.priceChanges).toHaveLength(0);
		if (ok.valid) expect(ok.validatedItems[0].basePrice).toBe(1000);

		const stale = await validateCartItems([cartItem({ basePrice: 900 })], 1);
		expect(stale.priceChanges).toHaveLength(1);
		expect(stale.priceChanges[0].currentPrice).toBe(1000);
	});

	it('respects an intentional discountedPrice of 0 (?? not ||)', async () => {
		mockState.rows = [row({ price: 1000, discountedPrice: 0 })];
		const result = await validateCartItems([cartItem({ basePrice: 0 })], 1);
		expect(result.priceChanges).toHaveLength(0);
		if (result.valid) expect(result.validatedItems[0].basePrice).toBe(0);
	});
});
