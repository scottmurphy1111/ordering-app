import { browser } from '$app/environment';

export type CartModifier = {
	group: string;
	name: string;
	priceAdjustment: number; // cents
};

export type CartItem = {
	itemId: number;
	name: string;
	basePrice: number; // cents
	quantity: number;
	selectedModifiers: CartModifier[];
	imageUrl?: string;
};

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
		return raw ? (JSON.parse(raw) as CartItem[]) : [];
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
	/** Call once per page/layout when the tenant slug is known */
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

	add(item: Omit<CartItem, 'quantity'>) {
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

	clear() {
		_items = [];
		persist();
	}
};
