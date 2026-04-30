import { db } from '$lib/server/db';
import { pickupWindows, pickupLocations } from '$lib/server/db/pickup';
import { orders } from '$lib/server/db/orders';
import { and, asc, count, eq, gt, inArray, ne } from 'drizzle-orm';

export type AvailableWindow = {
	id: number;
	name: string;
	startsAt: Date;
	endsAt: Date;
	cutoffAt: Date;
	maxOrders: number | null;
	notes: string | null;
	locationId: number | null;
	location: { name: string; address: unknown | null; notes: string | null } | null;
	remainingCapacity: number | null; // null = no cap
};

export type PickupWindowSnapshot = {
	windowId: number;
	name: string;
	startsAt: string; // ISO 8601 UTC
	endsAt: string; // ISO 8601 UTC
	notes: string | null;
	location: { name: string; address: unknown | null; notes: string | null } | null;
};

const VALIDATION_REASON = {
	notFound: 'Window not found',
	cancelled: 'This pickup window has been cancelled',
	cutoffPassed: 'The order cutoff for this pickup window has passed',
	full: 'This pickup window is full'
} as const;

type ValidationReason = (typeof VALIDATION_REASON)[keyof typeof VALIDATION_REASON];

export type ValidationResult =
	| { valid: false; reason: ValidationReason }
	| { valid: true; window: AvailableWindow };

/**
 * Returns up to 20 upcoming, bookable pickup windows for a vendor.
 * Filters: future start, cutoff not yet passed, not cancelled.
 * Enriched with location data and remaining capacity.
 */
export async function getAvailableWindows(
	vendorId: number,
	now = new Date()
): Promise<AvailableWindow[]> {
	const rows = await db
		.select({
			id: pickupWindows.id,
			name: pickupWindows.name,
			startsAt: pickupWindows.startsAt,
			endsAt: pickupWindows.endsAt,
			cutoffAt: pickupWindows.cutoffAt,
			maxOrders: pickupWindows.maxOrders,
			notes: pickupWindows.notes,
			locationId: pickupWindows.locationId,
			locationName: pickupLocations.name,
			locationAddress: pickupLocations.address,
			locationNotes: pickupLocations.notes
		})
		.from(pickupWindows)
		.leftJoin(pickupLocations, eq(pickupWindows.locationId, pickupLocations.id))
		.where(
			and(
				eq(pickupWindows.vendorId, vendorId),
				gt(pickupWindows.startsAt, now),
				gt(pickupWindows.cutoffAt, now),
				eq(pickupWindows.isCancelled, false)
			)
		)
		.orderBy(asc(pickupWindows.startsAt))
		.limit(20);

	if (rows.length === 0) return [];

	// Bulk count non-cancelled orders for capped windows only
	const cappedIds = rows.filter((r) => r.maxOrders !== null).map((r) => r.id);
	const orderCounts: Record<number, number> = {};
	if (cappedIds.length > 0) {
		const counts = await db
			.select({ windowId: orders.pickupWindowId, orderCount: count(orders.id) })
			.from(orders)
			.where(and(inArray(orders.pickupWindowId, cappedIds), ne(orders.status, 'cancelled')))
			.groupBy(orders.pickupWindowId);
		for (const c of counts) {
			if (c.windowId !== null) orderCounts[c.windowId] = Number(c.orderCount);
		}
	}

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		startsAt: r.startsAt,
		endsAt: r.endsAt,
		cutoffAt: r.cutoffAt,
		maxOrders: r.maxOrders,
		notes: r.notes,
		locationId: r.locationId,
		location: r.locationId
			? {
					name: r.locationName!,
					address: r.locationAddress ?? null,
					notes: r.locationNotes ?? null
				}
			: null,
		remainingCapacity: r.maxOrders !== null ? r.maxOrders - (orderCounts[r.id] ?? 0) : null
	}));
}

/**
 * Validates a pickup window for checkout: existence, IDOR guard, not-cancelled,
 * cutoff not passed, capacity not exceeded.
 */
export async function validateWindowForCheckout(
	windowId: number,
	vendorId: number,
	now = new Date()
): Promise<ValidationResult> {
	const win = await db.query.pickupWindows.findFirst({
		where: and(eq(pickupWindows.id, windowId), eq(pickupWindows.vendorId, vendorId))
	});

	if (!win) return { valid: false, reason: VALIDATION_REASON.notFound };
	if (win.isCancelled) return { valid: false, reason: VALIDATION_REASON.cancelled };
	if (win.cutoffAt <= now) return { valid: false, reason: VALIDATION_REASON.cutoffPassed };

	if (win.maxOrders !== null) {
		const [{ orderCount }] = await db
			.select({ orderCount: count(orders.id) })
			.from(orders)
			.where(and(eq(orders.pickupWindowId, windowId), ne(orders.status, 'cancelled')));
		if (Number(orderCount) >= win.maxOrders) {
			return { valid: false, reason: VALIDATION_REASON.full };
		}
	}

	const location = win.locationId
		? await db.query.pickupLocations.findFirst({
				where: eq(pickupLocations.id, win.locationId)
			})
		: null;

	const windowWithLocation: AvailableWindow = {
		id: win.id,
		name: win.name,
		startsAt: win.startsAt,
		endsAt: win.endsAt,
		cutoffAt: win.cutoffAt,
		maxOrders: win.maxOrders,
		notes: win.notes,
		locationId: win.locationId,
		location: location
			? { name: location.name, address: location.address ?? null, notes: location.notes ?? null }
			: null,
		remainingCapacity: null
	};

	return { valid: true, window: windowWithLocation };
}

/** Produces the canonical pickup window snapshot written to orders.pickupWindowSnapshot. */
export function buildSnapshotFromWindow(window: AvailableWindow): PickupWindowSnapshot {
	return {
		windowId: window.id,
		name: window.name,
		startsAt: window.startsAt.toISOString(),
		endsAt: window.endsAt.toISOString(),
		notes: window.notes ?? null,
		location: window.location ?? null
	};
}
