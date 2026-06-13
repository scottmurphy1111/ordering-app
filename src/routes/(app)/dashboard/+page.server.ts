import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { vendorUrl } from '$lib/server/vendor-origin';
import { eq, sql, and, gte, lt, ne, not, inArray, asc, desc, sum } from 'drizzle-orm';
import {
	catalogItems,
	catalogCategories,
	orders,
	orderItems,
	pickupWindows,
	pickupLocations
} from '$lib/server/db/schema';
import { getSetupChecklist } from '$lib/server/setup/checklist';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:overview');
	const vendorId = locals.vendorId!;

	const tz = locals.vendor?.timezone ?? 'America/New_York';

	// Day key (YYYY-MM-DD) in the vendor's timezone. The server runs in UTC, so the old
	// server-local keys mis-dated everything in the evening (UTC already the next day).
	const dayKey = (d: Date | string): string =>
		new Intl.DateTimeFormat('en-CA', {
			timeZone: tz,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(typeof d === 'string' ? new Date(d) : d);

	// Vendor-local midnight (as a UTC instant) for the day `offset` days from today.
	const zonedMidnight = (offset: number): Date => {
		const ymd = dayKey(new Date(Date.now() + offset * 86_400_000));
		const guess = new Date(`${ymd}T00:00:00Z`);
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		}).formatToParts(guess);
		const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
		const localAsUTC = Date.UTC(
			get('year'),
			get('month') - 1,
			get('day'),
			get('hour'),
			get('minute'),
			get('second')
		);
		return new Date(2 * guess.getTime() - localAsUTC);
	};

	const todayStart = zonedMidnight(0);
	const tomorrowStart = zonedMidnight(1);
	const dayAfterStart = zonedMidnight(2);
	const horizonEnd = zonedMidnight(3);

	const todayKey = dayKey(todayStart);
	const tomorrowKey = dayKey(tomorrowStart);
	const dayAfterKey = dayKey(dayAfterStart);

	const [
		itemCount,
		categoryCount,
		orderStats,
		horizonWindowRows,
		horizonOrderRows,
		horizonProductionRows,
		horizonSpecialOrderRows,
		setupChecklist
	] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)` })
			.from(catalogItems)
			.where(eq(catalogItems.vendorId, vendorId)),

		db
			.select({ count: sql<number>`count(*)` })
			.from(catalogCategories)
			.where(eq(catalogCategories.vendorId, vendorId)),

		db
			.select({
				total: sql<number>`count(*)`,
				revenue: sql<number>`coalesce(sum(total) filter (where payment_status = 'paid'), 0)`,
				pending: sql<number>`count(*) filter (where status in ('received','confirmed','preparing'))`
			})
			.from(orders)
			.where(eq(orders.vendorId, vendorId)),

		// All pickup windows in 3-day horizon
		db
			.select({
				id: pickupWindows.id,
				name: pickupWindows.name,
				startsAt: pickupWindows.startsAt,
				endsAt: pickupWindows.endsAt,
				locationName: pickupLocations.name
			})
			.from(pickupWindows)
			.leftJoin(pickupLocations, eq(pickupWindows.locationId, pickupLocations.id))
			.where(
				and(
					eq(pickupWindows.vendorId, vendorId),
					gte(pickupWindows.endsAt, todayStart),
					lt(pickupWindows.startsAt, horizonEnd)
				)
			)
			.orderBy(asc(pickupWindows.startsAt)),

		// All orders attached to horizon windows
		db
			.select({
				id: orders.id,
				orderNumber: orders.orderNumber,
				customerName: orders.customerName,
				total: orders.total,
				status: orders.status,
				windowStartsAt: pickupWindows.startsAt
			})
			.from(orders)
			.innerJoin(pickupWindows, eq(orders.pickupWindowId, pickupWindows.id))
			.where(
				and(
					eq(orders.vendorId, vendorId),
					ne(orders.status, 'cancelled' as typeof orders.status._.data),
					gte(pickupWindows.endsAt, todayStart),
					lt(pickupWindows.startsAt, horizonEnd)
				)
			)
			.orderBy(asc(pickupWindows.startsAt), asc(orders.createdAt)),

		// All production items in 3-day horizon (grouped per window for day bucketing)
		db
			.select({
				itemName: orderItems.name,
				selectedModifiers: orderItems.selectedModifiers,
				totalQuantity: sum(orderItems.quantity),
				windowStartsAt: pickupWindows.startsAt
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.innerJoin(pickupWindows, eq(orders.pickupWindowId, pickupWindows.id))
			.where(
				and(
					eq(orders.vendorId, vendorId),
					not(inArray(orders.status, ['ready', 'fulfilled', 'cancelled'])),
					gte(pickupWindows.endsAt, todayStart),
					lt(pickupWindows.startsAt, horizonEnd)
				)
			)
			.groupBy(orderItems.name, orderItems.selectedModifiers, pickupWindows.startsAt)
			.orderBy(desc(sum(orderItems.quantity)), asc(orderItems.name)),

		// Special (catering) orders in the 3-day horizon, keyed by scheduledFor
		db
			.select({
				id: orders.id,
				orderNumber: orders.orderNumber,
				customerName: orders.customerName,
				total: orders.total,
				status: orders.status,
				paymentStatus: orders.paymentStatus,
				scheduledFor: orders.scheduledFor
			})
			.from(orders)
			.where(
				and(
					eq(orders.vendorId, vendorId),
					eq(orders.type, 'special_order'),
					not(inArray(orders.status, ['ready', 'fulfilled', 'cancelled'])),
					gte(orders.scheduledFor, todayStart),
					lt(orders.scheduledFor, horizonEnd)
				)
			)
			.orderBy(asc(orders.scheduledFor)),

		getSetupChecklist(vendorId)
	]);

	function bucketWindows(key: string) {
		return horizonWindowRows
			.filter((r) => dayKey(r.startsAt) === key)
			.map((r) => ({
				id: r.id,
				name: r.name,
				startsAt: r.startsAt,
				endsAt: r.endsAt,
				locationName: r.locationName ?? null
			}));
	}

	function bucketOrders(key: string) {
		return horizonOrderRows
			.filter((r) => dayKey(r.windowStartsAt) === key)
			.map((r) => ({
				id: r.id,
				orderNumber: r.orderNumber,
				customerName: r.customerName,
				total: r.total,
				status: r.status
			}));
	}

	function bucketCustomDateOrders(key: string) {
		return customDateOrderRows
			.filter((r) => r.scheduledFor && dayKey(r.scheduledFor) === key)
			.map((r) => ({
				id: r.id,
				orderNumber: r.orderNumber,
				customerName: r.customerName,
				total: r.total,
				status: r.status
			}));
	}

	function bucketSpecialOrders(key: string) {
		return horizonSpecialOrderRows
			.filter((r) => r.scheduledFor && dayKey(r.scheduledFor) === key)
			.map((r) => ({
				id: r.id,
				orderNumber: r.orderNumber,
				customerName: r.customerName,
				total: r.total,
				status: r.status,
				paymentStatus: r.paymentStatus,
				scheduledFor: r.scheduledFor
			}));
	}

	function bucketProduction(key: string) {
		const map = new Map<
			string,
			{
				itemName: string;
				modifiers: string[];
				totalQuantity: number;
				pickupLabel?: string;
				overdue?: boolean;
			}
		>();
		for (const r of horizonProductionRows) {
			if (dayKey(r.windowStartsAt) !== key) continue;
			const modifiers = Array.isArray(r.selectedModifiers)
				? (r.selectedModifiers as Array<{ name: string; quantity?: number }>).map((m) =>
						(m.quantity ?? 1) > 1 ? `${m.name} ×${m.quantity}` : m.name
					)
				: [];
			const mapKey = `${r.itemName}||${[...modifiers].sort().join('|')}`;
			const existing = map.get(mapKey);
			const qty = parseInt(r.totalQuantity ?? '0');
			if (existing) {
				existing.totalQuantity += qty;
			} else {
				map.set(mapKey, { itemName: r.itemName, modifiers, totalQuantity: qty });
			}
		}
		return [...map.values()].sort((a, b) => b.totalQuantity - a.totalQuantity);
	}

	function bucketCustomDateProduction(key: string) {
		const pickupFmt = new Intl.DateTimeFormat('en-US', {
			timeZone: locals.vendor?.timezone ?? 'America/New_York',
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
		const items: Array<{
			itemName: string;
			modifiers: string[];
			totalQuantity: number;
			pickupLabel: string;
			overdue: boolean;
		}> = [];
		for (const r of customDateProductionRows) {
			if (!r.scheduledFor) continue;
			const sched = new Date(r.scheduledFor);
			const lead = r.leadDays ?? 0;
			// Prep-start day = scheduledFor minus leadDays, keyed in the vendor's timezone.
			const startKey = dayKey(new Date(sched.getTime() - lead * 86_400_000));
			const overdue = startKey < todayKey;
			const bucketKey = overdue ? todayKey : startKey;
			if (bucketKey !== key) continue;
			const modifiers = Array.isArray(r.selectedModifiers)
				? (r.selectedModifiers as Array<{ name: string; quantity?: number }>).map((m) =>
						(m.quantity ?? 1) > 1 ? `${m.name} ×${m.quantity}` : m.name
					)
				: [];
			items.push({
				itemName: r.itemName,
				modifiers,
				totalQuantity: parseInt(r.totalQuantity ?? '0'),
				pickupLabel: pickupFmt.format(sched),
				overdue
			});
		}
		return items;
	}

	const [recentOrders, customDateProductionRows, customDateOrderRows] = await Promise.all([
		db.query.orders.findMany({
			where: eq(orders.vendorId, vendorId),
			orderBy: (o, { desc }) => [desc(o.createdAt)],
			limit: 5,
			columns: {
				id: true,
				orderNumber: true,
				customerName: true,
				total: true,
				status: true,
				type: true,
				createdAt: true
			}
		}),
		// Custom-date orders have no pickup window, so the windowed production query above
		// misses them. Pull all future ones; bucketCustomDateProduction dates each to its
		// prep-start day (scheduledFor − leadDays). gte() already drops null scheduledFor.
		db
			.select({
				scheduledFor: orders.scheduledFor,
				leadDays: catalogItems.customDateLeadDays,
				itemName: orderItems.name,
				selectedModifiers: orderItems.selectedModifiers,
				totalQuantity: sum(orderItems.quantity)
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.leftJoin(catalogItems, eq(orderItems.catalogItemId, catalogItems.id))
			.where(
				and(
					eq(orders.vendorId, vendorId),
					eq(orders.pickupType, 'custom_date'),
					not(inArray(orders.status, ['ready', 'fulfilled', 'cancelled'])),
					gte(orders.scheduledFor, todayStart)
				)
			)
			.groupBy(
				orders.scheduledFor,
				catalogItems.customDateLeadDays,
				orderItems.name,
				orderItems.selectedModifiers
			),
		// Custom-date orders for the ORDERS section, bucketed by pickup day (scheduledFor)
		// within the 3-day horizon. Production for these is handled separately above.
		db
			.select({
				id: orders.id,
				orderNumber: orders.orderNumber,
				customerName: orders.customerName,
				total: orders.total,
				status: orders.status,
				scheduledFor: orders.scheduledFor
			})
			.from(orders)
			.where(
				and(
					eq(orders.vendorId, vendorId),
					eq(orders.pickupType, 'custom_date'),
					ne(orders.status, 'cancelled' as typeof orders.status._.data),
					gte(orders.scheduledFor, todayStart),
					lt(orders.scheduledFor, horizonEnd)
				)
			)
	]);

	return {
		setupChecklist,
		stats: {
			items: Number(itemCount[0]?.count ?? 0),
			categories: Number(categoryCount[0]?.count ?? 0),
			orders: Number(orderStats[0]?.total ?? 0),
			revenue: Number(orderStats[0]?.revenue ?? 0),
			pendingOrders: Number(orderStats[0]?.pending ?? 0)
		},
		horizon: {
			today: {
				windows: bucketWindows(todayKey),
				orders: bucketOrders(todayKey),
				customDateOrders: bucketCustomDateOrders(todayKey),
				production: [...bucketProduction(todayKey), ...bucketCustomDateProduction(todayKey)],
				specialOrders: bucketSpecialOrders(todayKey)
			},
			tomorrow: {
				windows: bucketWindows(tomorrowKey),
				orders: bucketOrders(tomorrowKey),
				customDateOrders: bucketCustomDateOrders(tomorrowKey),
				production: [...bucketProduction(tomorrowKey), ...bucketCustomDateProduction(tomorrowKey)],
				specialOrders: bucketSpecialOrders(tomorrowKey)
			},
			dayAfter: {
				windows: bucketWindows(dayAfterKey),
				orders: bucketOrders(dayAfterKey),
				customDateOrders: bucketCustomDateOrders(dayAfterKey),
				production: [...bucketProduction(dayAfterKey), ...bucketCustomDateProduction(dayAfterKey)],
				specialOrders: bucketSpecialOrders(dayAfterKey)
			},
			dayAfterDate: dayAfterStart
		},
		vendorTimezone: locals.vendor?.timezone ?? 'America/New_York',
		recentOrders,
		catalogUrl: locals.vendor?.slug ? vendorUrl(locals.vendor.slug, '/catalog') : null
	};
};
