import { eq, sql } from 'drizzle-orm';
import { vendor } from './db/vendor';
import type { db as Db } from './db';

/**
 * Atomically increments the per-vendor order number counter and returns the
 * formatted order number string (e.g., "#47").
 *
 * Safe under concurrent inserts: the UPDATE ... RETURNING is atomic at the
 * row-lock level. If the subsequent INSERT INTO orders fails, the counter
 * value is "wasted" but no orders will use it. Acceptable trade-off.
 */
export async function generateOrderNumber(
	vendorId: number,
	db: typeof Db
): Promise<string> {
	const [updated] = await db
		.update(vendor)
		.set({ lastOrderNumber: sql`${vendor.lastOrderNumber} + 1` })
		.where(eq(vendor.id, vendorId))
		.returning({ lastOrderNumber: vendor.lastOrderNumber });

	if (!updated) {
		throw new Error(`Vendor ${vendorId} not found when generating order number`);
	}

	return `#${updated.lastOrderNumber}`;
}
