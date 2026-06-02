import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/orders';
import { vendor } from '$lib/server/db/vendor';
import { specialOrderPayments, specialOrderReminders } from '$lib/server/db/special-orders';
import { systemEvents } from '$lib/server/db/system-events';
import { and, eq, inArray, isNull, isNotNull } from 'drizzle-orm';
import { sendBalanceReminder } from '$lib/server/special-orders/reminders';

type ReminderKind = 'upcoming_7d' | 'upcoming_1d' | 'overdue';

function kindForDaysUntilDue(daysUntilDue: number): ReminderKind | null {
	if (daysUntilDue === 7) return 'upcoming_7d';
	if (daysUntilDue === 1) return 'upcoming_1d';
	if (daysUntilDue === -1) return 'overdue';
	return null;
}

/**
 * Daily balance-reminder engine for deposit-split special orders.
 *
 * Cadence (exact-day, UTC-midnight gating like pending-approval-reminders):
 *   7 days before due  → upcoming_7d
 *   1 day  before due  → upcoming_1d
 *   1 day  after  due  → overdue (one follow-up)
 *
 * Two independent effects per balance:
 *  - Overdue transition: when a scheduled balance's due date has passed, flip
 *    status → 'overdue'. This is a status fact and runs regardless of the
 *    reminder toggle.
 *  - Sending: gated by effectiveEnabled (payment override ?? vendor default) and
 *    deduped against the reminder log (each kind sends at most once per balance).
 */
export async function runBalanceReminders(): Promise<{
	processed: number;
	sent: number;
	overdueMarked: number;
	errors: string[];
}> {
	const errors: string[] = [];
	let processed = 0;
	let sent = 0;
	let overdueMarked = 0;

	const todayUtcMidnight = new Date();
	todayUtcMidnight.setUTCHours(0, 0, 0, 0);

	// Unpaid balance installments still in play.
	const rows = await db
		.select({
			paymentId: specialOrderPayments.id,
			payToken: specialOrderPayments.payToken,
			amountCents: specialOrderPayments.amountCents,
			dueAt: specialOrderPayments.dueAt,
			status: specialOrderPayments.status,
			remindersEnabled: specialOrderPayments.remindersEnabled,
			vendorId: specialOrderPayments.vendorId,
			orderNumber: orders.orderNumber,
			customerName: orders.customerName,
			customerEmail: orders.customerEmail,
			vendorName: vendor.name,
			backgroundColor: vendor.backgroundColor,
			slug: vendor.slug,
			subscriptionTier: vendor.subscriptionTier,
			timezone: vendor.timezone,
			vendorEmail: vendor.email,
			balanceRemindersEnabled: vendor.balanceRemindersEnabled
		})
		.from(specialOrderPayments)
		.innerJoin(orders, eq(orders.id, specialOrderPayments.orderId))
		.innerJoin(vendor, eq(vendor.id, specialOrderPayments.vendorId))
		.where(
			and(
				eq(specialOrderPayments.label, 'Balance'),
				inArray(specialOrderPayments.status, ['scheduled', 'overdue']),
				isNotNull(specialOrderPayments.dueAt),
				isNull(specialOrderPayments.paidAt)
			)
		);

	// Batch-load already-sent reminder kinds per payment so the loop can dedupe
	// without an extra query per row.
	const paymentIds = rows.map((r) => r.paymentId);
	const sentByPayment = new Map<number, Set<string>>();
	if (paymentIds.length > 0) {
		const sentRows = await db
			.select({
				paymentId: specialOrderReminders.paymentId,
				kind: specialOrderReminders.kind
			})
			.from(specialOrderReminders)
			.where(inArray(specialOrderReminders.paymentId, paymentIds));
		for (const r of sentRows) {
			const set = sentByPayment.get(r.paymentId) ?? new Set<string>();
			set.add(r.kind);
			sentByPayment.set(r.paymentId, set);
		}
	}

	for (const row of rows) {
		try {
			processed++;
			if (!row.dueAt) continue;

			const dueUtcMidnight = new Date(row.dueAt);
			dueUtcMidnight.setUTCHours(0, 0, 0, 0);
			const daysUntilDue = Math.round(
				(dueUtcMidnight.getTime() - todayUtcMidnight.getTime()) / 86_400_000
			);

			// Overdue transition — always, independent of the reminder toggle.
			if (daysUntilDue < 0 && row.status === 'scheduled') {
				await db
					.update(specialOrderPayments)
					.set({ status: 'overdue' })
					.where(eq(specialOrderPayments.id, row.paymentId));
				overdueMarked++;
			}

			const kind = kindForDaysUntilDue(daysUntilDue);
			if (!kind) continue;

			const effectiveEnabled = row.remindersEnabled ?? row.balanceRemindersEnabled;
			if (!effectiveEnabled) continue;
			if (sentByPayment.get(row.paymentId)?.has(kind)) continue;
			if (!row.customerEmail) continue;

			await sendBalanceReminder({
				payment: {
					id: row.paymentId,
					payToken: row.payToken,
					amountCents: row.amountCents,
					dueAt: row.dueAt,
					status: row.status
				},
				order: {
					orderNumber: row.orderNumber,
					customerName: row.customerName,
					customerEmail: row.customerEmail
				},
				vendor: {
					name: row.vendorName,
					email: row.vendorEmail,
					backgroundColor: row.backgroundColor,
					slug: row.slug,
					subscriptionTier: row.subscriptionTier,
					timezone: row.timezone
				},
				vendorId: row.vendorId,
				kind
			});
			sent++;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`payment ${row.paymentId}: ${msg}`);
			console.error(`[balance-reminders] failed payment ${row.paymentId}:`, err);
		}
	}

	if (sent > 0 || overdueMarked > 0) {
		console.log(
			`[balance-reminders] processed ${processed}, sent ${sent}, marked ${overdueMarked} overdue`
		);
	}

	await recordEvent(processed, sent, overdueMarked, errors);
	return { processed, sent, overdueMarked, errors };
}

async function recordEvent(
	processed: number,
	sent: number,
	overdueMarked: number,
	errors: string[]
) {
	try {
		await db.insert(systemEvents).values({
			eventType: 'cron.balance_reminders',
			status: errors.length > 0 ? 'error' : 'ok',
			vendorId: null,
			metadata: { processed, sent, overdueMarked, errors: errors.length }
		});
	} catch (e) {
		console.error('[balance-reminders] failed to record system event:', e);
	}
}
