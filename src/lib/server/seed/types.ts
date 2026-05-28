// Pure type definitions for archetype fixtures — no db imports, no SvelteKit aliases.
// Safe to import from Bun CLI scripts and SvelteKit server code alike.

export type FulfillmentModelValue = 'storefront' | 'pickup_only' | 'hybrid';

export type VendorType =
	| 'bakery'
	| 'farm'
	| 'butcher'
	| 'florist'
	| 'brewery'
	| 'coffee_shop'
	| 'food_truck'
	| 'specialty_maker'
	| 'market_vendor'
	| 'other';

export type VendorRole = 'owner' | 'admin' | 'staff' | 'viewer';

export interface LoyaltyConfig {
	enabled: boolean;
	type: 'stamps' | 'points';
	stamps: {
		stampsPerOrder: number;
		rewardAt: number;
		rewardDescription: string;
	};
	points: {
		pointsPerDollar: number;
		redeemAt: number;
		redeemValue: number;
	};
}

export interface SeedCategory {
	name: string;
	key: string;
	sortOrder: number;
}

export interface SeedItem {
	categoryKey: string;
	name: string;
	description: string;
	price: number;
	sortOrder: number;
	pickupType?: 'custom_date';
	customDateLeadDays?: number;
	modifierKeys?: string[];
	availabilityMode?: 'always' | 'storefront_only' | 'events_only' | 'special_order';
}

export interface SeedTemplate {
	name: string;
	recurrence: string;
	windowStart: string;
	windowEnd: string;
	isActive: boolean;
	exdates: string[];
}

export interface SeedOrderLineItem {
	name: string;
	quantity: number;
	basePrice: number;
	selectedModifiers: Array<{ name: string; priceAdjustment: number }>;
}

export interface SeedOrder {
	orderNumber: string;
	customerName: string;
	customerEmail: string;
	type: 'pickup';
	status: 'received' | 'preparing' | 'ready' | 'fulfilled' | 'pending_approval' | 'payment_failed';
	paymentStatus: 'paid' | 'pending' | 'failed';
	pickupType?: 'custom_date';
	pickupMode?: 'pickup_event' | 'storefront_hours' | 'custom_date';
	subtotal: number;
	discount?: number;
	promoCode?: string;
	tax: number;
	total: number;
	scheduledFor?: Date;
	stripeCustomerId?: string;
	stripeSetupIntentId?: string;
	stripePaymentIntentId?: string;
	notes?: string;
	items: SeedOrderLineItem[];
}

export interface SeedModifierOption {
	name: string;
	priceAdjustment: number;
	isDefault: boolean;
	sortOrder: number;
}

export interface SeedModifier {
	key: string;
	name: string;
	isRequired: boolean;
	maxSelections: number;
	sortOrder: number;
	options: SeedModifierOption[];
}

export interface SeedPickupLocation {
	name: string;
	address: {
		street: string;
		city: string;
		state: string;
		zip: string;
	};
	notes: string;
	sortOrder: number;
	isActive: boolean;
}

export interface SeedBranding {
	tagline: string;
	logoUrl: string | null;
	heroImageUrl: string | null;
	faviconUrl: string;
	backgroundColor: string;
	accentColor: string;
	foregroundColor: string;
	fontPair: string;
	headerMode: 'logo' | 'name';
	heroDisplayMode: 'none' | 'headline' | 'headline_tagline';
	heroHeadline: string | null;
}

export interface SeedSettings {
	currency: string;
	taxRate: number;
	enableTips: boolean;
	defaultTipPercentages: number[];
	allowPickup: boolean;
	minimumOrderAmount: number;
	estimatedPrepTimeMinutes: number;
	asapPickupEnabled: boolean;
	loyalty: LoyaltyConfig;
}

export type DayOfWeek =
	| 'monday'
	| 'tuesday'
	| 'wednesday'
	| 'thursday'
	| 'friday'
	| 'saturday'
	| 'sunday';

export interface ArchetypeHoursEntry {
	dayOfWeek: DayOfWeek;
	openTime: string; // HH:MM
	closeTime: string; // HH:MM
}

export interface ArchetypeHoursException {
	date: string; // YYYY-MM-DD
	isClosed: boolean;
	openTime?: string; // HH:MM
	closeTime?: string; // HH:MM
	note?: string;
}

export interface SeedPromoCode {
	code: string;
	description: string;
	type: 'percent' | 'fixed';
	amount: number;
	minOrderAmount: number;
	maxUses: number | null;
	expiresAt: Date | null;
	isActive: boolean;
}

export interface SeedInvitation {
	email: string;
	role: VendorRole;
	expiresInDays: number;
}

export interface ArchetypeFixture {
	key: string;
	label: string;
	description: string;
	fulfillmentModel: FulfillmentModelValue;
	/** Fulfillment models this archetype is appropriate for (used to filter picker). */
	allowedFulfillmentModels: FulfillmentModelValue[];
	vendorType: VendorType;
	categories: SeedCategory[];
	items: SeedItem[];
	modifiers: SeedModifier[];
	templates: SeedTemplate[];
	locations: SeedPickupLocation[];
	hours: ArchetypeHoursEntry[];
	hoursExceptions: ArchetypeHoursException[];
	branding: SeedBranding;
	settings: SeedSettings;
	promoCodes: SeedPromoCode[];
	invitations: SeedInvitation[];
	orders: SeedOrder[];
	orderCounter: number;
}
