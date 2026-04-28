import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let _stripe: Stripe | null = null;

export function getOrderLocalStripe(): Stripe {
	if (!_stripe) {
		const key = env.ORDERLOCAL_STRIPE_SECRET_KEY ?? env.STRIPE_SECRET_KEY;
		if (!key) throw new Error('ORDERLOCAL_STRIPE_SECRET_KEY is not set');
		_stripe = new Stripe(key);
	}
	return _stripe;
}

export function getPlanPriceId(
	planKey: string,
	interval: 'monthly' | 'annual' = 'monthly'
): string | undefined {
	const map: Record<string, string | undefined> = {
		'pro:monthly': env.STRIPE_PRICE_PRO,
		'pro:annual': env.STRIPE_PRICE_PRO_ANNUAL
	};
	return map[`${planKey}:${interval}`];
}

const ANNUAL_CAPABLE_ADDONS = new Set(['loyalty', 'subscriptions']);

export function getAddonPriceId(
	addonKey: string,
	interval: 'monthly' | 'annual' = 'monthly'
): string | undefined {
	const monthlyMap: Record<string, string | undefined> = {
		sms_notifications: env.STRIPE_PRICE_ADDON_SMS,
		custom_domain: env.STRIPE_PRICE_ADDON_CUSTOM_DOMAIN,
		analytics: env.STRIPE_PRICE_ADDON_ANALYTICS,
		loyalty: env.STRIPE_PRICE_ADDON_LOYALTY,
		promo_codes: env.STRIPE_PRICE_ADDON_PROMO_CODES,
		subscriptions: env.STRIPE_PRICE_ADDON_SUBSCRIPTIONS
	};
	const annualMap: Record<string, string | undefined> = {
		loyalty: env.STRIPE_PRICE_ADDON_LOYALTY_ANNUAL,
		subscriptions: env.STRIPE_PRICE_ADDON_SUBSCRIPTIONS_ANNUAL
	};

	if (interval === 'annual' && ANNUAL_CAPABLE_ADDONS.has(addonKey)) {
		return annualMap[addonKey];
	}
	return monthlyMap[addonKey];
}
