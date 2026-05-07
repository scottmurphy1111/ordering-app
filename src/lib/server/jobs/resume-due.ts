import { db } from '$lib/server/db';
import { vendor } from '$lib/server/db/vendor';
import { systemEvents } from '$lib/server/db/system-events';
import { and, isNotNull, lte, eq } from 'drizzle-orm';
import { getOrderLocalStripe } from '$lib/server/stripe-billing';
import { sendEmail } from '$lib/server/email';
import { pauseResumedEmail } from '$lib/server/email/templates/pauseResumed';
import type Stripe from 'stripe';

export async function runResumeDue(): Promise<{ processed: number; errors: string[] }> {
	const now = new Date();
	const errors: string[] = [];
	let processed = 0;

	const dueVendors = await db.query.vendor.findMany({
		where: and(
			isNotNull(vendor.subscriptionPausedAt),
			isNotNull(vendor.pauseUntil),
			lte(vendor.pauseUntil, now)
		),
		columns: {
			id: true,
			name: true,
			email: true,
			subscriptionTier: true,
			stripeSubscriptionId: true
		}
	});

	for (const v of dueVendors) {
		try {
			if (v.stripeSubscriptionId) {
				const stripe = getOrderLocalStripe();
				await stripe.subscriptions.update(v.stripeSubscriptionId, {
					pause_collection: '' as Stripe.Emptyable<Stripe.SubscriptionUpdateParams.PauseCollection>
				});
			}

			await db
				.update(vendor)
				.set({ subscriptionPausedAt: null, pauseUntil: null, updatedAt: new Date() })
				.where(eq(vendor.id, v.id));

			if (v.email) {
				const planName =
					(v.subscriptionTier ?? 'plan').charAt(0).toUpperCase() +
					(v.subscriptionTier ?? 'plan').slice(1);
				await sendEmail({
					to: v.email,
					subject: 'Your Order Local subscription has resumed',
					html: pauseResumedEmail({ tenantName: v.name, planName })
				}).catch((err) => console.error(`[resume-due] email failed vendor ${v.id}:`, err));
			}

			processed++;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`vendor ${v.id}: ${msg}`);
			console.error(`[resume-due] failed vendor ${v.id}:`, err);
		}
	}

	if (processed > 0) console.log(`[resume-due] resumed ${processed} subscriptions`);

	try {
		await db
			.insert(systemEvents)
			.values({ eventType: 'cron.resume_due', vendorId: null, metadata: { processed, errors } });
	} catch (e) {
		console.error('[resume-due] failed to record system event:', e);
	}

	return { processed, errors };
}
