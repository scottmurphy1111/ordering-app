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
			'Order management',
			'Customer email receipts',
			'Catalog QR code'
		]
	},
	{
		key: 'market',
		name: 'Market',
		price: 29,
		annualMonthly: 24,
		annualTotal: 290,
		annualSavings: 58,
		itemLimit: 30,
		features: ['Up to 30 catalog items', 'Everything in Starter', 'CSV catalog import']
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
			'Unlimited catalog items',
			'Everything in Market',
			'All add-ons unlocked',
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

// Returns the next billing anchor date: the upcoming 15th of the month.
// If today is the 15th, returns today (no bridge invoice — full cycle starts immediately).
// If today is before the 15th, returns the 15th of the current month.
// If today is past the 15th, returns the 15th of the following month.
//
// Timezone-naive — uses local server time. For pre-launch, server local time is
// sufficient. If multi-timezone vendor billing becomes a concern post-launch, pass
// an IANA timezone and convert `from` accordingly.
export function nextBillingAnchor(from: Date = new Date()): Date {
	const day = from.getDate();
	const result = new Date(from);
	// End-of-day local. Midnight would put the anchor in the past on the 15th itself,
	// causing Stripe to reject billing_cycle_anchor (must be future-or-now).
	result.setHours(23, 59, 59, 999);
	if (day === 15) {
		// Already on an anchor — use today
		return result;
	}
	if (day < 15) {
		result.setDate(15);
	} else {
		// Past the 15th — next 15th is next month.
		// Set to 1st before advancing month to prevent JavaScript date overflow
		// (e.g. Jan 31 → setMonth(1) would overflow to March 3 without this guard).
		result.setDate(1);
		result.setMonth(result.getMonth() + 1);
		result.setDate(15);
	}
	return result;
}

export function unixTimestamp(date: Date): number {
	return Math.floor(date.getTime() / 1000);
}

/**
 * Compute refund preview for an immediate (mid-period) cancel of an annual
 * subscription. Cancel-effective = end of current month (clamped to period_end
 * if end-of-month is past period_end). Unused months = whole calendar months
 * strictly between cancel-effective and period_end. Refund = unusedMonths/12 ×
 * annual total.
 *
 * Returns refund=0 and unusedMonths=0 when cancel-effective ≥ period_end (the
 * vendor is in the final month of the period; nothing left to refund).
 *
 * Pure function — no Stripe calls. Caller resolves period_end from the live
 * subscription before invoking.
 */
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

export function cancelImmediateRefundPreview(args: {
	periodEnd: Date;
	annualTotalCents: number;
	now?: Date;
}): {
	cancelEffective: Date;
	unusedMonths: number;
	refundCents: number;
} {
	const now = args.now ?? new Date();
	// End of current month, local time. Day 0 of next month = last day of this month.
	const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
	const cancelEffective =
		endOfMonth.getTime() > args.periodEnd.getTime() ? args.periodEnd : endOfMonth;

	if (cancelEffective.getTime() >= args.periodEnd.getTime()) {
		return { cancelEffective, unusedMonths: 0, refundCents: 0 };
	}

	// Whole calendar months strictly between cancelEffective (end of month X)
	// and periodEnd (the 15th of some month Y). Equivalently: count of full
	// months from the 1st-of-(X+1) up to but not including the month containing periodEnd.
	const startMonthIdx = cancelEffective.getFullYear() * 12 + cancelEffective.getMonth() + 1; // first full month after cancel
	const endMonthIdx = args.periodEnd.getFullYear() * 12 + args.periodEnd.getMonth(); // month of periodEnd (partial, excluded)
	const unusedMonths = Math.max(0, endMonthIdx - startMonthIdx);

	const refundCents = Math.round((unusedMonths * args.annualTotalCents) / 12);
	return { cancelEffective, unusedMonths, refundCents };
}
