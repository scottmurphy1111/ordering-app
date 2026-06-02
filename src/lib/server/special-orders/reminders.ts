import { db } from '$lib/server/db';
import { specialOrderReminders } from '$lib/server/db/special-orders';
import { sendEmail } from '$lib/server/email';
import { specialOrderBalanceReminderEmail } from '$lib/server/email/templates/specialOrderBalanceReminder';
import { vendorUrl } from '$lib/server/vendor-origin';

/**
 * Single send-and-log path for a balance reminder, shared by the cron job
 * (auto-reminders) and the vendor's manual "Send reminder" action. Keeping both
 * callers on this helper prevents the email + log-insert from drifting apart.
 *
 * Gating (effectiveEnabled, kind selection, dedupe, overdue transition) lives in
 * the caller — this helper unconditionally sends and records. Requires a
 * customer email; throws if absent so callers can surface the failure.
 */
export async function sendBalanceReminder(args: {
	payment: {
		id: number;
		payToken: string;
		amountCents: number;
		dueAt: Date | null;
		status: string;
	};
	order: { orderNumber: string; customerName: string | null; customerEmail: string | null };
	vendor: {
		name: string;
		email: string | null;
		backgroundColor: string | null;
		slug: string;
		subscriptionTier: string | null;
		timezone: string | null;
	};
	vendorId: number;
	kind: 'upcoming_7d' | 'upcoming_1d' | 'overdue' | 'manual';
}): Promise<void> {
	const { payment, order, vendor, vendorId, kind } = args;
	if (!order.customerEmail) {
		throw new Error('Cannot send balance reminder: order has no customer email');
	}

	const isOverdue = kind === 'overdue' || payment.status === 'overdue';

	await sendEmail({
		to: order.customerEmail,
		subject: isOverdue
			? `Balance past due for order ${order.orderNumber} — ${vendor.name}`
			: `Balance due for order ${order.orderNumber} — ${vendor.name}`,
		html: specialOrderBalanceReminderEmail({
			vendorName: vendor.name,
			primaryColor: vendor.backgroundColor ?? undefined,
			vendorSubscriptionTier: vendor.subscriptionTier ?? undefined,
			customerName: order.customerName ?? 'there',
			orderNumber: order.orderNumber,
			balanceCents: payment.amountCents,
			balanceDueAt: payment.dueAt ?? new Date(),
			payUrl: vendorUrl(vendor.slug, `/balance/${payment.payToken}`),
			isOverdue,
			vendorTimezone: vendor.timezone ?? undefined
		}),
		fromName: vendor.name,
		replyTo: vendor.email ?? undefined,
		category: 'special_order_balance_reminder'
	});

	await db.insert(specialOrderReminders).values({
		paymentId: payment.id,
		vendorId,
		kind,
		channel: 'email',
		sentTo: order.customerEmail
	});
}
