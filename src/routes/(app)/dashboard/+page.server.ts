import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import { catalogItems, catalogCategories, orders, orderItems } from '$lib/server/db/schema';
import { getSetupChecklist } from '$lib/server/setup/checklist';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:overview');
	const vendorId = locals.vendorId!;

	const [itemCount, categoryCount, orderStats, topItemsRows, orderTypeSplitRows, setupChecklist] =
		await Promise.all([
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

			db
				.select({
					name: orderItems.name,
					totalQty: sql<number>`sum(${orderItems.quantity})`
				})
				.from(orderItems)
				.innerJoin(orders, eq(orderItems.orderId, orders.id))
				.where(eq(orders.vendorId, vendorId))
				.groupBy(orderItems.name)
				.orderBy(sql`sum(${orderItems.quantity}) desc`)
				.limit(5),

			db
				.select({
					type: orders.type,
					count: sql<number>`count(*)`
				})
				.from(orders)
				.where(eq(orders.vendorId, vendorId))
				.groupBy(orders.type),

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
		topItems: topItemsRows.map((r) => ({ name: r.name, qty: Number(r.totalQty) })),
		orderTypeSplit: orderTypeSplitRows.map((r) => ({ type: r.type, count: Number(r.count) })),
		recentOrders
	};
};
