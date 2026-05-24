import { db } from './db';
import { vendor } from './db/vendor';
import { vendorNotifications, type NewVendorNotification } from './db/notifications';
import { eq } from 'drizzle-orm';
import type { EmailCategory } from './email';

/**
 * Categories vendors CANNOT opt out of. These are tied to the business
 * relationship (billing, subscription state) or account moderation
 * (pending approval). The send-time check ignores opt-outs for these
 * categories.
 *
 * If a new always-on category is added later (e.g. an account security
 * category), add it here.
 */
export const CRITICAL_EMAIL_CATEGORIES = new Set<EmailCategory>([
	'subscription_confirmed',
	'subscription_tier_changed',
	'subscription_interval_changed',
	'subscription_addon_changed',
	'subscription_cancellation_scheduled',
	'subscription_cancellation_immediate',
	'subscription_cancellation_completed',
	'subscription_reactivated',
	'pause_confirmed',
	'pause_reminder',
	'pause_resumed',
	'pending_approval_reminder',
	'payment_failed'
]);

/**
 * Returns true if the vendor's prefs allow sending email for this
 * category. Critical categories always return true. Other categories
 * check the vendor's `emailOptOuts` array.
 *
 * Failure to load prefs (DB error, missing row) returns true —
 * fail-open. We'd rather send a duplicate than silently drop a
 * notification.
 */
export async function shouldSendEmail(
	vendorId: number,
	category: EmailCategory
): Promise<boolean> {
	if (CRITICAL_EMAIL_CATEGORIES.has(category)) return true;
	try {
		const row = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { notificationPrefs: true }
		});
		const optOuts = row?.notificationPrefs?.emailOptOuts ?? [];
		return !optOuts.includes(category);
	} catch (e) {
		console.error('[notifications] shouldSendEmail check failed:', e);
		return true; // fail-open
	}
}

/**
 * Write an entry to the vendor notification feed. Caller passes the
 * fully-composed title/body. Safe to call alongside an email send —
 * failures are logged but do not throw.
 */
export async function recordNotification(
	payload: Omit<NewVendorNotification, 'id' | 'createdAt' | 'readAt'>
): Promise<void> {
	try {
		await db.insert(vendorNotifications).values(payload);
	} catch (e) {
		console.error('[notifications] failed to record:', payload.category, e);
	}
}
