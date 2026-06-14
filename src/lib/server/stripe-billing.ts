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
		'pro:annual': env.STRIPE_PRICE_PRO_ANNUAL,
		'market:monthly': env.STRIPE_PRICE_MARKET,
		'market:annual': env.STRIPE_PRICE_MARKET_ANNUAL,
		'growth:monthly': env.STRIPE_PRICE_GROWTH,
		'growth:annual': env.STRIPE_PRICE_GROWTH_ANNUAL
	};
	return map[`${planKey}:${interval}`];
}

/**
 * Reverse-map a Stripe price ID back to the tier key.
 * Returns null if the price ID doesn't match any known plan price.
 *
 * Used by webhook handlers to resolve tier from a subscription's plan item.
 */
export function getTierKeyFromPriceId(priceId: string): string | null {
	if (priceId === env.STRIPE_PRICE_GROWTH || priceId === env.STRIPE_PRICE_GROWTH_ANNUAL)
		return 'growth';
	if (priceId === env.STRIPE_PRICE_MARKET || priceId === env.STRIPE_PRICE_MARKET_ANNUAL)
		return 'market';
	if (priceId === env.STRIPE_PRICE_PRO || priceId === env.STRIPE_PRICE_PRO_ANNUAL) return 'pro';
	return null;
}

// Add-on subscription items inherit the parent subscription's billing_cycle_anchor
// automatically. The new add-on item's first charge is prorated from today to the
// next anchor date (15th), and full add-on charges land on the 15th going forward.
// No explicit billing_cycle_anchor is needed when creating add-on items.
//
// Add-ons are monthly-only. Annual variants existed previously for `loyalty` and
// `subscriptions` and were removed because the per-row asymmetry created UX
// problems (which add-ons can be annual? — confusing) and complicated cancel-with-refund
// math. The corresponding `STRIPE_PRICE_ADDON_LOYALTY_ANNUAL` and
// `STRIPE_PRICE_ADDON_SUBSCRIPTIONS_ANNUAL` env vars and Stripe Dashboard prices
// remain available if this decision is reversed.
export function getAddonPriceId(addonKey: string): string | undefined {
	const map: Record<string, string | undefined> = {
		sms_notifications: env.STRIPE_PRICE_ADDON_SMS,
		analytics: env.STRIPE_PRICE_ADDON_ANALYTICS,
		loyalty: env.STRIPE_PRICE_ADDON_LOYALTY,
		subscriptions: env.STRIPE_PRICE_ADDON_SUBSCRIPTIONS
	};
	return map[addonKey];
}

/**
 * Issue a prorated refund against the most recent charge on a subscription.
 *
 * Resolves the charge via the Stripe v22 invoice payments path:
 *   subscription.latest_invoice.payments[0].payment.payment_intent → PI → latest_charge
 *
 * Falls back to a customer balance credit when the charge can't be resolved
 * (e.g. disputed, expired, or PI unavailable). Balance credit offsets the
 * next invoice if the vendor returns; otherwise it sits on the customer record.
 *
 * The caller is responsible for expanding `latest_invoice.payments.data.payment`
 * on the subscription before passing it here.
 */
export async function issueSubscriptionRefund(
	stripe: Stripe,
	subscription: Stripe.Subscription,
	stripeCustomerId: string | null,
	refundCents: number,
	vendorId: number,
	balanceDescription = `Order Local refund (${refundCents} cents)`
): Promise<{ refundIssued: boolean }> {
	if (refundCents <= 0) return { refundIssued: false };

	const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
	const firstPayment = latestInvoice?.payments?.data?.[0];
	const piRef = firstPayment?.payment?.payment_intent;
	const paymentIntentId = typeof piRef === 'string' ? piRef : (piRef as { id?: string } | null)?.id;

	let chargeId: string | null = null;
	if (paymentIntentId) {
		try {
			const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
				expand: ['latest_charge']
			});
			chargeId =
				typeof pi.latest_charge === 'string'
					? pi.latest_charge
					: ((pi.latest_charge as Stripe.Charge | null)?.id ?? null);
		} catch {
			// PI unavailable — fall through to balance credit
		}
	}

	if (chargeId) {
		try {
			await stripe.refunds.create(
				{ charge: chargeId, amount: refundCents },
				{ idempotencyKey: `refund:${vendorId}:cancel:${chargeId}` }
			);
			return { refundIssued: true };
		} catch (err) {
			console.error(
				'[issueSubscriptionRefund] refund to charge failed; falling back to balance credit:',
				err
			);
			if (stripeCustomerId) {
				await stripe.customers.createBalanceTransaction(
					stripeCustomerId,
					{ amount: -refundCents, currency: 'usd', description: balanceDescription },
					{ idempotencyKey: `balance-tx:${vendorId}:credit:${chargeId}:${refundCents}` }
				);
				return { refundIssued: true };
			}
		}
	} else if (stripeCustomerId) {
		await stripe.customers.createBalanceTransaction(
			stripeCustomerId,
			{ amount: -refundCents, currency: 'usd', description: balanceDescription },
			{ idempotencyKey: `balance-tx:${vendorId}:credit:no-charge:${refundCents}` }
		);
		return { refundIssued: true };
	}

	return { refundIssued: false };
}
