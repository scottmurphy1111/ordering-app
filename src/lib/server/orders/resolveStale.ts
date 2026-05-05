import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { pickupWindows } from '$lib/server/db/pickup';
import { and, eq, lt, inArray, isNotNull } from 'drizzle-orm';

const STALE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

const NON_TERMINAL_STATUSES = ['received', 'confirmed', 'preparing', 'ready', 'scheduled'] as const;

/**
 * Auto-resolves non-terminal orders whose pickup window ended more than 7 days ago.
 *
 * Mapping:
 *   - paid → fulfilled (customer presumably picked up; vendor forgot to mark)
 *   - pending/failed → cancelled (customer never completed payment)
 *   - refunded → not touched (already cancelled per workflow)
 *
 * Window-bound orders only. Free-form orders (no pickup window) are not affected.
 *
 * Returns the total count of resolved orders. Errors are caught and logged; the
 * function never throws (auto-resolve is best-effort cleanup, not correctness-critical).
 */
export async function resolveStaleOrders(vendorId: number): Promise<number> {
	const cutoff = new Date(Date.now() - STALE_GRACE_MS);

	try {
		// Subquery: pickup windows that ended before the cutoff.
		const staleWindowIds = db
			.select({ id: pickupWindows.id })
			.from(pickupWindows)
			.where(lt(pickupWindows.endsAt, cutoff));

		// Branch 1: paid stale orders → fulfilled.
		const fulfilledRows = await db
			.update(orders)
			.set({ status: 'fulfilled', updatedAt: new Date() })
			.where(
				and(
					eq(orders.vendorId, vendorId),
					isNotNull(orders.pickupWindowId),
					inArray(orders.pickupWindowId, staleWindowIds),
					inArray(orders.status, NON_TERMINAL_STATUSES),
					eq(orders.paymentStatus, 'paid')
				)
			)
			.returning({ id: orders.id });

		// Branch 2: unpaid stale orders → cancelled.
		const cancelledRows = await db
			.update(orders)
			.set({ status: 'cancelled', updatedAt: new Date() })
			.where(
				and(
					eq(orders.vendorId, vendorId),
					isNotNull(orders.pickupWindowId),
					inArray(orders.pickupWindowId, staleWindowIds),
					inArray(orders.status, NON_TERMINAL_STATUSES),
					inArray(orders.paymentStatus, ['pending', 'failed'] as const)
				)
			)
			.returning({ id: orders.id });

		const total = fulfilledRows.length + cancelledRows.length;
		if (total > 0) {
			console.log(
				`[auto-resolve] vendor ${vendorId}: ${fulfilledRows.length} → fulfilled, ${cancelledRows.length} → cancelled`
			);
		}
		return total;
	} catch (err) {
		console.error('[auto-resolve] failed:', err);
		return 0;
	}
}
