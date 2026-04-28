export type AddonItem = { key: string; stripeItemId: string };
export type BillingInterval = 'monthly' | 'annual';

export function hasAddon(
	addons: Array<AddonItem | string> | null | undefined,
	key: string
): boolean {
	if (!addons?.length) return false;
	return addons.some((a) => (typeof a === 'string' ? a === key : a.key === key));
}

export const TIERS = [
	{
		key: 'starter',
		name: 'Starter',
		price: 0,
		itemLimit: 10,
		features: [
			'Up to 10 menu items',
			'Online ordering & payments',
			'Order management',
			'Customer email receipts',
			'Menu QR code'
		]
	},
	{
		key: 'pro',
		name: 'Pro',
		price: 79,
		annualMonthly: 65,
		annualTotal: 780,
		annualSavings: 168,
		itemLimit: null,
		features: [
			'Unlimited menu items',
			'Everything in Starter',
			'All add-ons unlocked',
			'Bulk import menu items via CSV',
			'White-label — remove OrderLocal branding',
			'Integrations — QuickBooks, Xero, Mailchimp, Zapier & more (coming soon)',
			'Dedicated support'
		]
	}
] as const;

export type TierKey = (typeof TIERS)[number]['key'];

export const ADDONS = [
	{
		key: 'sms_notifications',
		name: 'SMS Notifications',
		price: 19,
		icon: 'mdi:message-text-outline',
		description: 'Text customers when their order is ready or its status changes.'
	},
	{
		key: 'custom_domain',
		name: 'Custom Domain',
		price: 12,
		icon: 'mdi:web',
		description: 'Use your own domain (e.g. menu.yourbusiness.com) for your ordering page.'
	},
	{
		key: 'analytics',
		name: 'Advanced Analytics',
		price: 19,
		icon: 'mdi:chart-line',
		description: 'Revenue charts, top items, peak hours, and customer insights.'
	},
	{
		key: 'loyalty',
		name: 'Loyalty Program',
		price: 29,
		icon: 'mdi:star-circle-outline',
		description: 'Stamp cards and points system to reward repeat customers.'
	},
	{
		key: 'promo_codes',
		name: 'Promo Codes',
		price: 9,
		icon: 'mdi:ticket-percent-outline',
		description: 'Create discount codes for promotions, events, or loyal customers.'
	},
	{
		key: 'subscriptions',
		name: 'Subscriptions',
		price: 29,
		icon: 'mdi:refresh-circle',
		description:
			'Sell recurring items or services — customers subscribe and are billed monthly or yearly.'
	}
] as const;

export type AddonKey = (typeof ADDONS)[number]['key'];

// Add-ons that support annual billing and their pricing
export const ANNUAL_ADDON_PRICING: Partial<
	Record<AddonKey, { monthly: number; total: number; savings: number }>
> = {
	loyalty: { monthly: 24, total: 288, savings: 60 },
	subscriptions: { monthly: 24, total: 288, savings: 60 }
};

export function getTier(key: string) {
	return TIERS.find((t) => t.key === key) ?? TIERS[0];
}

export function getItemLimit(tierKey: string): number | null {
	return getTier(tierKey).itemLimit;
}

export function isAtItemLimit(tierKey: string, itemCount: number): boolean {
	const limit = getItemLimit(tierKey);
	return limit !== null && itemCount >= limit;
}
