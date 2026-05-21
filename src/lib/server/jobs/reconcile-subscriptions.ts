import { db } from '$lib/server/db';
import { vendor } from '$lib/server/db/vendor';
import { systemEvents } from '$lib/server/db/system-events';
import { and, isNotNull, isNull, eq } from 'drizzle-orm';
import { getOrderLocalStripe, getTierKeyFromPriceId } from '$lib/server/stripe-billing';
import Stripe from 'stripe';

export async function runReconcileSubscriptions(): Promise<{
	processed: number;
	drifted: number;
	errors: string[];
}> {
	const errors: string[] = [];
	let processed = 0;
	let drifted = 0;

	const stripe = getOrderLocalStripe();

	const vendors = await db.query.vendor.findMany({
		where: and(isNull(vendor.deletedAt), eq(vendor.isActive, true), isNotNull(vendor.stripeSubscriptionId)),
		columns: {
			id: true,
			subscriptionTier: true,
			subscriptionStatus: true,
			subscriptionEndsAt: true,
			subscriptionPausedAt: true,
			stripeSubscriptionId: true,
			stripeCustomerId: true
		}
	});

	for (const v of vendors) {
		const subId = v.stripeSubscriptionId!;
		try {
			let sub: Stripe.Subscription;
			try {
				sub = await stripe.subscriptions.retrieve(subId, {
					expand: ['items.data.price']
				});
			} catch (err) {
				// "No such subscription" — revert to starter
				const isNoSuchSub =
					err instanceof Stripe.errors.StripeInvalidRequestError &&
					(err.message.toLowerCase().includes('no such subscription') ||
						err.code === 'resource_missing');

				if (isNoSuchSub) {
					await db
						.update(vendor)
						.set({
							subscriptionTier: 'starter',
							subscriptionStatus: 'active',
							subscriptionEndsAt: null,
							stripeSubscriptionId: null,
							subscriptionPausedAt: null,
							updatedAt: new Date()
						})
						.where(eq(vendor.id, v.id));

					await db.insert(systemEvents).values({
						eventType: 'cron.reconcile_subscription',
						status: 'error',
						vendorId: v.id,
						metadata: { reason: 'stripe_subscription_missing', stripeSubscriptionId: subId }
					});

					errors.push(`vendor ${v.id}: subscription ${subId} not found in Stripe — reverted to starter`);
					processed++;
					continue;
				}

				// Other Stripe error — log and skip
				const msg = err instanceof Error ? err.message : String(err);
				errors.push(`vendor ${v.id}: ${msg}`);
				console.error(`[reconcile-subscriptions] failed vendor ${v.id}:`, err);
				continue;
			}

			// Compute Stripe truth for the four reconcilable fields
			const stripeStatus =
				sub.status === 'incomplete_expired' ? 'canceled' : sub.status;

			const stripeEndsAt =
				sub.cancel_at_period_end && sub.cancel_at
					? new Date(sub.cancel_at * 1000)
					: null;

			// Derive tier from first matching price item
			let stripeTier: string | null = null;
			for (const item of sub.items.data) {
				const price = item.price as Stripe.Price;
				const tierKey = getTierKeyFromPriceId(price.id);
				if (tierKey) {
					stripeTier = tierKey;
					break;
				}
			}

			const stripePausedAt =
				sub.pause_collection !== null
					? sub.metadata?.paused_at
						? new Date(sub.metadata.paused_at)
						: new Date()
					: null;

			// Detect drift — compare nullable Date fields by ISO string
			type DriftField = 'subscriptionStatus' | 'subscriptionEndsAt' | 'subscriptionTier' | 'subscriptionPausedAt';
			const fieldsChanged: DriftField[] = [];
			const before: Partial<Record<DriftField, string | null>> = {};
			const after: Partial<Record<DriftField, string | null>> = {};

			if (v.subscriptionStatus !== stripeStatus) {
				fieldsChanged.push('subscriptionStatus');
				before.subscriptionStatus = v.subscriptionStatus;
				after.subscriptionStatus = stripeStatus;
			}

			const dbEndsAtIso = v.subscriptionEndsAt ? new Date(v.subscriptionEndsAt).toISOString() : null;
			const stripeEndsAtIso = stripeEndsAt ? stripeEndsAt.toISOString() : null;
			if (dbEndsAtIso !== stripeEndsAtIso) {
				fieldsChanged.push('subscriptionEndsAt');
				before.subscriptionEndsAt = dbEndsAtIso;
				after.subscriptionEndsAt = stripeEndsAtIso;
			}

			// Only overwrite tier if Stripe resolved to a known tier
			if (stripeTier !== null && v.subscriptionTier !== stripeTier) {
				fieldsChanged.push('subscriptionTier');
				before.subscriptionTier = v.subscriptionTier;
				after.subscriptionTier = stripeTier;
			}

			const dbPausedAtIso = v.subscriptionPausedAt ? new Date(v.subscriptionPausedAt).toISOString() : null;
			const stripePausedAtIso = stripePausedAt ? stripePausedAt.toISOString() : null;
			if (dbPausedAtIso !== stripePausedAtIso) {
				fieldsChanged.push('subscriptionPausedAt');
				before.subscriptionPausedAt = dbPausedAtIso;
				after.subscriptionPausedAt = stripePausedAtIso;
			}

			if (fieldsChanged.length > 0) {
				const update: Record<string, string | Date | null> = { updatedAt: new Date() };
				if (fieldsChanged.includes('subscriptionStatus')) update.subscriptionStatus = stripeStatus;
				if (fieldsChanged.includes('subscriptionEndsAt')) update.subscriptionEndsAt = stripeEndsAt;
				if (fieldsChanged.includes('subscriptionTier') && stripeTier !== null) update.subscriptionTier = stripeTier;
				if (fieldsChanged.includes('subscriptionPausedAt')) update.subscriptionPausedAt = stripePausedAt;

				await db.update(vendor).set(update).where(eq(vendor.id, v.id));

				await db.insert(systemEvents).values({
					eventType: 'cron.reconcile_subscription',
					status: 'ok',
					vendorId: v.id,
					metadata: { fieldsChanged, before, after }
				});

				drifted++;
			}

			processed++;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`vendor ${v.id}: ${msg}`);
			console.error(`[reconcile-subscriptions] failed vendor ${v.id}:`, err);
		}
	}

	if (drifted > 0)
		console.log(`[reconcile-subscriptions] corrected drift for ${drifted}/${processed} vendors`);

	try {
		await db.insert(systemEvents).values({
			eventType: 'cron.reconcile_subscriptions',
			status: errors.length > 0 ? 'error' : 'ok',
			vendorId: null,
			metadata: { processed, drifted, errors }
		});
	} catch (e) {
		console.error('[reconcile-subscriptions] failed to record summary event:', e);
	}

	return { processed, drifted, errors };
}
