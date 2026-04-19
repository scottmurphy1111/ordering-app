export type AddonItem = { key: string; stripeItemId: string };

export function hasAddon(addons: Array<AddonItem | string> | null | undefined, key: string): boolean {
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
			'Online ordering',
			'Order management',
			'Customer email receipts',
			'Menu QR code'
		]
	},
	{
		key: 'growth',
		name: 'Growth',
		price: 29,
		itemLimit: null,
		features: [
			'Unlimited menu items',
			'Everything in Starter',
			'Website embed',
			'Priority support'
		]
	},
	{
		key: 'pro',
		name: 'Pro',
		price: 79,
		itemLimit: null,
		features: [
			'Everything in Growth',
			'Multiple locations',
			'Dedicated support'
		]
	}
] as const;

export type TierKey = (typeof TIERS)[number]['key'];

export const ADDONS = [
	{
		key: 'table_qr',
		name: 'Table QR Codes',
		price: 9,
		icon: 'mdi:table-chair',
		description: 'Per-table QR codes for dine-in ordering with the table number pre-selected.'
	},
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
	}
] as const;

export type AddonKey = (typeof ADDONS)[number]['key'];

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
