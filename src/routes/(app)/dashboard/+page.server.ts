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

	const [
		itemCount,
		categoryCount,
		orderStats,
		todayWindowsRows,
		todayProductionRows,
		tomorrowProductionRows,
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

		// Today's pickup windows with order counts
		db
			.select({
				id: pickupWindows.id,
				name: pickupWindows.name,
				startsAt: pickupWindows.startsAt,
				endsAt: pickupWindows.endsAt,
				locationName: pickupLocations.name,
				orderCount: sql<number>`count(distinct ${orders.id}) filter (where ${orders.id} is not null and ${orders.status} != 'cancelled')`
			})
			.from(pickupWindows)
			.leftJoin(pickupLocations, eq(pickupWindows.locationId, pickupLocations.id))
			.leftJoin(orders, eq(orders.pickupWindowId, pickupWindows.id))
			.where(
				and(
					eq(pickupWindows.vendorId, vendorId),
					gte(pickupWindows.endsAt, todayStart),
					lt(pickupWindows.startsAt, tomorrowStart)
				)
			)
			.groupBy(pickupWindows.id, pickupLocations.name)
			.orderBy(asc(pickupWindows.startsAt)),

		// Today's production preview — top 5 items needed across today's windows
		db
			.select({
				itemName: orderItems.name,
				selectedModifiers: orderItems.selectedModifiers,
				totalQuantity: sum(orderItems.quantity)
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.innerJoin(pickupWindows, eq(orders.pickupWindowId, pickupWindows.id))
			.where(
				and(
					eq(orders.vendorId, vendorId),
					ne(orders.status, 'cancelled' as typeof orders.status._.data),
					gte(pickupWindows.endsAt, todayStart),
					lt(pickupWindows.startsAt, tomorrowStart)
				)
			)
			.groupBy(orderItems.name, orderItems.selectedModifiers)
			.orderBy(desc(sum(orderItems.quantity)), asc(orderItems.name))
			.limit(5),

		// Tomorrow's production preview — same shape as today, shifted by 24h
		db
			.select({
				itemName: orderItems.name,
				selectedModifiers: orderItems.selectedModifiers,
				totalQuantity: sum(orderItems.quantity)
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.innerJoin(pickupWindows, eq(orders.pickupWindowId, pickupWindows.id))
			.where(
				and(
					eq(orders.vendorId, vendorId),
					ne(orders.status, 'cancelled' as typeof orders.status._.data),
					gte(pickupWindows.endsAt, tomorrowStart),
					lt(pickupWindows.startsAt, dayAfterStart)
				)
			)
			.groupBy(orderItems.name, orderItems.selectedModifiers)
			.orderBy(desc(sum(orderItems.quantity)), asc(orderItems.name))
			.limit(5),

		getSetupChecklist(vendorId)
	]);

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
		todayWindows: todayWindowsRows.map((r) => ({
			id: r.id,
			name: r.name,
			startsAt: r.startsAt,
			endsAt: r.endsAt,
			locationName: r.locationName ?? null,
			orderCount: Number(r.orderCount ?? 0)
		})),
		todayProduction: todayProductionRows.map((r) => ({
			itemName: r.itemName,
			modifiers: Array.isArray(r.selectedModifiers)
				? (r.selectedModifiers as Array<{ name: string }>).map((m) => m.name)
				: [],
			totalQuantity: parseInt(r.totalQuantity ?? '0')
		})),
		tomorrowProduction: tomorrowProductionRows.map((r) => ({
			itemName: r.itemName,
			modifiers: Array.isArray(r.selectedModifiers)
				? (r.selectedModifiers as Array<{ name: string }>).map((m) => m.name)
				: [],
			totalQuantity: parseInt(r.totalQuantity ?? '0')
		})),
		vendorTimezone: locals.vendor?.timezone ?? 'America/New_York',
		recentOrders
	};
};
