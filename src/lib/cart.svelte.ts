import { browser } from '$app/environment';

export type CartModifier = {
	group: string;
	name: string;
	priceAdjustment: number; // cents
};

export type PickupType = 'windowed' | 'custom_date';

export type CartItem = {
	itemId: number;
	name: string;
	basePrice: number; // cents
	quantity: number;
	selectedModifiers: CartModifier[];
	imageUrl?: string;
	isSubscription?: boolean;
	billingInterval?: string; // 'monthly' | 'yearly'
	pickupType: PickupType;
	customDateLeadDays?: number;
};

export class CartTypeMismatchError extends Error {
	constructor(
		public readonly currentType: PickupType,
		public readonly attemptedType: PickupType
	) {
		super(`Cart contains ${currentType} items; cannot add ${attemptedType} item without clearing.`);
		this.name = 'CartTypeMismatchError';
	}
}

/** Unit price for one of this item (base + all modifiers) */
export function itemUnitPrice(item: CartItem): number {
	return item.basePrice + item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0);
}

function storageKey(slug: string) {
	return `cart:${slug}`;
}

function loadItems(slug: string): CartItem[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(storageKey(slug));
		if (!raw) return [];
		const parsed = JSON.parse(raw) as CartItem[];
		// Backward compat: pre-Phase-3 items lack pickupType; default to 'windowed'.
		return parsed.map((item) => ({ ...item, pickupType: item.pickupType ?? 'windowed' }));
	} catch {
		return [];
	}
}

// Module-level reactive state — one cart per page session, re-init when slug changes
let _slug = $state('');
let _items = $state<CartItem[]>([]);

function persist() {
	if (!browser || !_slug) return;
	localStorage.setItem(storageKey(_slug), JSON.stringify(_items));
}

export const cart = {
	/** Call once per page/layout when the vendor slug is known */
	init(slug: string) {
		if (_slug === slug) return;
		_slug = slug;
		_items = loadItems(slug);
	},

	get items(): CartItem[] {
		return _items;
	},

	get count(): number {
		return _items.reduce((s, i) => s + i.quantity, 0);
	},

	get subtotal(): number {
		return _items.reduce((s, i) => s + itemUnitPrice(i) * i.quantity, 0);
	},

	get pickupType(): PickupType | null {
		return _items.length > 0 ? _items[0].pickupType : null;
	},

	add(item: Omit<CartItem, 'quantity'>) {
		if (_items.length > 0 && _items[0].pickupType !== item.pickupType) {
			throw new CartTypeMismatchError(_items[0].pickupType, item.pickupType);
		}
		const modKey = JSON.stringify(item.selectedModifiers);
		const existing = _items.find(
			(i) => i.itemId === item.itemId && JSON.stringify(i.selectedModifiers) === modKey
		);
		if (existing) {
			existing.quantity++;
		} else {
			_items.push({ ...item, quantity: 1 });
		}
		persist();
	},

	increment(index: number) {
		if (_items[index]) {
			_items[index].quantity++;
			persist();
		}
	},

	decrement(index: number) {
		if (!_items[index]) return;
		if (_items[index].quantity <= 1) {
			_items.splice(index, 1);
		} else {
			_items[index].quantity--;
		}
		persist();
	},

	remove(index: number) {
		_items.splice(index, 1);
		persist();
	},

	updateItemPrice(itemId: number, newPrice: number) {
		for (const item of _items) {
			if (item.itemId === itemId) {
				item.basePrice = newPrice;
			}
		}
		persist();
	},

	clear() {
		_items = [];
		persist();
	}
};
