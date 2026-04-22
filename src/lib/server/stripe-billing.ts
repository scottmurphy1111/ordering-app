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

export function getPlanPriceId(planKey: string): string | undefined {
	const map: Record<string, string | undefined> = {
		growth: env.STRIPE_PRICE_GROWTH,
		pro: env.STRIPE_PRICE_PRO
	};
	return map[planKey];
}

export function getAddonPriceId(addonKey: string): string | undefined {
	const map: Record<string, string | undefined> = {
		table_qr: env.STRIPE_PRICE_ADDON_TABLE_QR,
		sms_notifications: env.STRIPE_PRICE_ADDON_SMS,
		custom_domain: env.STRIPE_PRICE_ADDON_CUSTOM_DOMAIN,
		analytics: env.STRIPE_PRICE_ADDON_ANALYTICS,
		loyalty: env.STRIPE_PRICE_ADDON_LOYALTY,
		promo_codes: env.STRIPE_PRICE_ADDON_PROMO_CODES,
		subscriptions: env.STRIPE_PRICE_ADDON_SUBSCRIPTIONS
	};
	return map[addonKey];
}
