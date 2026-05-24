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
			'Up to 10 catalog items',
			'Online ordering & payments',
			'Multiple pickup locations',
			'Pickup windows & cutoff times',
			'Order management',
			'Customer email receipts',
			'Catalog QR code'
		],
		includedAddons: [] as readonly string[]
	},
	{
		key: 'market',
		name: 'Market',
		price: 49,
		annualMonthly: 39,
		annualTotal: 468,
		annualSavings: 120,
		itemLimit: 30,
		features: [
			'Up to 30 catalog items',
			'Everything in Starter',
			'CSV catalog import',
			'Eligible for all add-ons'
		],
		includedAddons: [] as readonly string[]
	},
	{
		key: 'pro',
		name: 'Pro',
		price: 99,
		annualMonthly: 79,
		annualTotal: 948,
		annualSavings: 240,
		itemLimit: null,
		features: [
			'Unlimited catalog items',
			'Everything in Market',
			'Embed on your website',
			'Priority support',
			'SMS Notifications included',
			'Advanced Analytics included',
			'White-label — hide OrderLocal branding',
			'Eligible for Loyalty and Subscriptions add-ons'
		],
		includedAddons: ['sms_notifications', 'analytics'] as readonly string[]
	}
] as const;

export type TierKey = (typeof TIERS)[number]['key'];

export const ADDONS = [
	{
		key: 'sms_notifications',
		name: 'SMS Notifications',
		price: 29,
		icon: 'mdi:message-text-outline',
		description: 'Text customers when their order is ready or its status changes.'
	},
	{
		key: 'analytics',
		name: 'Advanced Analytics',
		price: 29,
		icon: 'mdi:chart-line',
		description: 'Revenue charts, top items, peak hours, and customer insights.'
	},
	{
		key: 'loyalty',
		name: 'Loyalty Program',
		price: 19,
		icon: 'mdi:star-circle-outline',
		description: 'Stamp cards and points system to reward repeat customers.'
	},
	{
		key: 'subscriptions',
		name: 'Subscriptions',
		price: 19,
		icon: 'mdi:refresh-circle',
		description:
			'Sell recurring items or services — customers subscribe and are billed monthly or yearly.'
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

export function getIncludedAddons(tierKey: string): readonly string[] {
	return getTier(tierKey).includedAddons;
}

export function effectiveHasAddon(
	tierKey: string,
	addons: Array<AddonItem | string> | null | undefined,
	addonKey: string
): boolean {
	if (getIncludedAddons(tierKey).includes(addonKey)) return true;
	return hasAddon(addons, addonKey);
}

/**
 * Convert a YYYY-MM-DD date string to a UTC timestamp representing the last
 * millisecond of that calendar day in the vendor's local timezone
 * (i.e. 23:59:59.999 local = the instant just before the next day starts).
 *
 * Probe strategy: start at noon UTC of the NEXT calendar day. For all US
 * timezones (UTC-4 to UTC-11), this renders as an early AM hour on the next
 * local day, so subtracting those hours/minutes/seconds lands exactly on
 * local midnight of the next day. End-of-day = that midnight - 1 ms.
 *
 * Falls back to UTC end-of-day on invalid timezone.
 */
export function pauseUntilTimestamp(dateYYYYMMDD: string, vendorTimezone: string): Date {
	let tz = vendorTimezone;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
	} catch {
		tz = 'UTC';
	}

	const [y, m, d] = dateYYYYMMDD.split('-').map(Number);
	const probe = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0, 0));

	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		})
			.formatToParts(probe)
			.map(({ type, value }) => [type, value])
	);

	const h = parseInt(parts.hour === '24' ? '0' : parts.hour, 10);
	const mi = parseInt(parts.minute, 10);
	const s = parseInt(parts.second, 10);
	const midnightUtc = probe.getTime() - (h * 3600 + mi * 60 + s) * 1000;
	return new Date(midnightUtc - 1);
}

/**
 * Compute the refund preview for an immediate (mid-term) cancellation of an
 * annual subscription. Under the signup-date anchor model, "cancel immediately"
 * means now — the cancel-effective date IS now. The refund covers the unused
 * portion of the annual term from now to period_end, prorated by day.
 *
 * Returns refund=0 when the period has effectively ended.
 *
 * Pure function — no Stripe calls. Caller resolves period_end from the live
 * subscription before invoking.
 */
export function cancelImmediateRefundPreview(args: {
	periodEnd: Date;
	annualTotalCents: number;
	now?: Date;
}): {
	cancelEffective: Date;
	unusedDays: number;
	unusedMonths: number; // approximate (floor(unusedDays / 30)) — retained for display
	refundCents: number;
} {
	const now = args.now ?? new Date();
	const cancelEffective = now;

	const msRemaining = args.periodEnd.getTime() - now.getTime();
	if (msRemaining <= 0) {
		return { cancelEffective, unusedDays: 0, unusedMonths: 0, refundCents: 0 };
	}

	const MS_PER_DAY = 24 * 60 * 60 * 1000;
	const unusedDays = Math.floor(msRemaining / MS_PER_DAY);
	// Annual term is 365 days. Refund = unused-day fraction of annual total.
	const refundCents = Math.round((unusedDays * args.annualTotalCents) / 365);
	const unusedMonths = Math.floor(unusedDays / 30);

	return { cancelEffective, unusedDays, unusedMonths, refundCents };
}
