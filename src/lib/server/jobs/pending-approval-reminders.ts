import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/orders';
import { vendor } from '$lib/server/db/vendor';
import { systemEvents } from '$lib/server/db/system-events';
import { and, eq, isNull, inArray } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { sendEmail } from '$lib/server/email';
import { pendingApprovalReminderEmail } from '$lib/server/email/templates/pendingApprovalReminder';

export async function runPendingApprovalReminders(): Promise<{
	processed: number;
	errors: string[];
}> {
	const errors: string[] = [];
	let processed = 0;

	const todayUtcMidnight = new Date();
	todayUtcMidnight.setUTCHours(0, 0, 0, 0);

	// Fetch all pending_approval orders with no active proposal (proposedAt IS NULL).
	// A proposal in flight means the customer is deciding — don't nag the vendor.
	const pendingOrders = await db.query.orders.findMany({
		where: and(eq(orders.status, 'pending_approval'), isNull(orders.proposedAt)),
		columns: {
			id: true,
			vendorId: true,
			orderNumber: true,
			customerName: true,
			scheduledFor: true,
			createdAt: true
		}
	});

	// Group by vendorId, collecting orders that hit a threshold today.
	const byVendor = new Map<number, Array<{ orderNumber: string; customerName: string; scheduledFor?: string; daysOpen: 1 | 3 | 7 }>>();

	for (const order of pendingOrders) {
		const createdUtcMidnight = new Date(order.createdAt);
		createdUtcMidnight.setUTCHours(0, 0, 0, 0);

		const daysOpen = Math.round(
			(todayUtcMidnight.getTime() - createdUtcMidnight.getTime()) / 86_400_000
		);

		if (daysOpen !== 1 && daysOpen !== 3 && daysOpen !== 7) continue;

		const scheduledFor = order.scheduledFor
			? order.scheduledFor.toLocaleDateString('en-US', {
					month: 'long',
					day: 'numeric',
					year: 'numeric'
				})
			: undefined;

		const existing = byVendor.get(order.vendorId) ?? [];
		existing.push({
			orderNumber: order.orderNumber,
			customerName: order.customerName ?? 'Customer',
			scheduledFor,
			daysOpen: daysOpen as 1 | 3 | 7
		});
		byVendor.set(order.vendorId, existing);
	}

	if (byVendor.size === 0) {
		await recordEvent(0, []);
		return { processed: 0, errors: [] };
	}

	// Fetch vendor details for all matched vendors in one query.
	const vendorIds = Array.from(byVendor.keys());
	const vendorRows = await db.query.vendor.findMany({
		where: inArray(vendor.id, vendorIds),
		columns: { id: true, name: true, email: true }
	});

	const vendorMap = new Map(vendorRows.map((v) => [v.id, v]));
	const origin = env.ORIGIN ?? 'https://app.getorderlocal.com';

	for (const [vendorId, orderList] of byVendor) {
		const v = vendorMap.get(vendorId);
		if (!v?.email) continue;

		try {
			// Urgency level = oldest order in the batch.
			const maxDaysOpen = Math.max(...orderList.map((o) => o.daysOpen)) as 1 | 3 | 7;
			const dashboardUrl = `${origin}/dashboard/orders`;

			await sendEmail({
				to: v.email,
				subject:
					orderList.length === 1
						? `Custom-date order ${orderList[0].orderNumber} is waiting for your approval`
						: `${orderList.length} custom-date orders are waiting for your approval`,
				html: pendingApprovalReminderEmail({
					recipientName: v.name,
					pendingOrders: orderList,
					dashboardUrl,
					daysOpen: maxDaysOpen
				})
			});

			processed++;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`vendor ${vendorId}: ${msg}`);
			console.error(`[pending-approval-reminders] failed vendor ${vendorId}:`, err);
		}
	}

	if (processed > 0) {
		console.log(`[pending-approval-reminders] sent ${processed} reminder emails`);
	}

	await recordEvent(processed, errors);
	return { processed, errors };
}

async function recordEvent(processed: number, errors: string[]) {
	try {
		await db.insert(systemEvents).values({
			eventType: 'cron.pending_approval_reminders',
			status: errors.length > 0 ? 'error' : 'ok',
			vendorId: null,
			metadata: { processed, errors }
		});
	} catch (e) {
		console.error('[pending-approval-reminders] failed to record system event:', e);
	}
}
