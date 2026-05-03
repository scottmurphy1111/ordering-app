import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/orders';
import { pickupWindows } from '$lib/server/db/pickup';
import { and, eq, inArray, lt } from 'drizzle-orm';

// Orders for windows more than 3 days out start as 'scheduled'.
// They transition to 'received' when the window falls within this horizon.
export const HORIZON_DAYS = 3;

export type TransitionResult = {
	transitioned: number;
	orderIds: number[];
};

/**
 * Transitions 'scheduled' orders to 'received' when their pickup window's
 * startsAt falls within the HORIZON_DAYS window. Idempotent: re-running
 * produces no change once all eligible orders are already 'received'.
 */
export async function transitionScheduledOrders(now = new Date()): Promise<TransitionResult> {
	const horizonCutoff = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

	// Drizzle UPDATE doesn't support JOIN on Neon HTTP — SELECT IDs first, then UPDATE.
	const eligible = await db
		.select({ orderId: orders.id })
		.from(orders)
		.innerJoin(pickupWindows, eq(orders.pickupWindowId, pickupWindows.id))
		.where(
			and(
				eq(orders.status, 'scheduled' as typeof orders.status._.data),
				lt(pickupWindows.startsAt, horizonCutoff)
			)
		);

	if (eligible.length === 0) return { transitioned: 0, orderIds: [] };

	const ids = eligible.map((r) => r.orderId);

	await db
		.update(orders)
		.set({ status: 'received' as typeof orders.status._.data, updatedAt: new Date() })
		.where(inArray(orders.id, ids));

	return { transitioned: ids.length, orderIds: ids };
}
