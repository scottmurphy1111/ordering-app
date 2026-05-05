import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, sql, and, gte, lt, ne, asc, desc, sum } from 'drizzle-orm';
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

	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);
	const tomorrowStart = new Date(todayStart);
	tomorrowStart.setDate(tomorrowStart.getDate() + 1);
	const dayAfterStart = new Date(tomorrowStart);
	dayAfterStart.setDate(dayAfterStart.getDate() + 1);
	const horizonEnd = new Date(dayAfterStart);
	horizonEnd.setDate(horizonEnd.getDate() + 1);

	const dayKey = (d: Date | string): string => {
		const date = typeof d === 'string' ? new Date(d) : d;
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	};

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
				revenue: sql<number>`coalesce(sum(total), 0)`,
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
					ne(orders.status, 'cancelled' as typeof orders.status._.data),
					gte(pickupWindows.endsAt, todayStart),
					lt(pickupWindows.startsAt, horizonEnd)
				)
			)
			.groupBy(orderItems.name, orderItems.selectedModifiers, pickupWindows.startsAt)
			.orderBy(desc(sum(orderItems.quantity)), asc(orderItems.name)),

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

	function bucketProduction(key: string) {
		const map = new Map<string, { itemName: string; modifiers: string[]; totalQuantity: number }>();
		for (const r of horizonProductionRows) {
			if (dayKey(r.windowStartsAt) !== key) continue;
			const modifiers = Array.isArray(r.selectedModifiers)
				? (r.selectedModifiers as Array<{ name: string }>).map((m) => m.name)
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

	const recentOrders = await db.query.orders.findMany({
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
	});

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
				production: bucketProduction(todayKey)
			},
			tomorrow: {
				windows: bucketWindows(tomorrowKey),
				orders: bucketOrders(tomorrowKey),
				production: bucketProduction(tomorrowKey)
			},
			dayAfter: {
				windows: bucketWindows(dayAfterKey),
				orders: bucketOrders(dayAfterKey),
				production: bucketProduction(dayAfterKey)
			},
			dayAfterDate: dayAfterStart
		},
		vendorTimezone: locals.vendor?.timezone ?? 'America/New_York',
		recentOrders
	};
};
