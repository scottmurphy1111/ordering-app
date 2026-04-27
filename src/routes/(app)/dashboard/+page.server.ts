import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import { menuItems, menuCategories, orders, orderItems } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:overview');
	const tenantId = locals.tenantId!;

	const [itemCount, categoryCount, orderStats, topItemsRows, orderTypeSplitRows] =
		await Promise.all([
			db
				.select({ count: sql<number>`count(*)` })
				.from(menuItems)
				.where(eq(menuItems.tenantId, tenantId)),

			db
				.select({ count: sql<number>`count(*)` })
				.from(menuCategories)
				.where(eq(menuCategories.tenantId, tenantId)),

			db
				.select({
					total: sql<number>`count(*)`,
					revenue: sql<number>`coalesce(sum(total), 0)`,
					pending: sql<number>`count(*) filter (where status in ('received','confirmed','preparing'))`
				})
				.from(orders)
				.where(eq(orders.tenantId, tenantId)),

			db
				.select({
					name: orderItems.name,
					totalQty: sql<number>`sum(${orderItems.quantity})`
				})
				.from(orderItems)
				.innerJoin(orders, eq(orderItems.orderId, orders.id))
				.where(eq(orders.tenantId, tenantId))
				.groupBy(orderItems.name)
				.orderBy(sql`sum(${orderItems.quantity}) desc`)
				.limit(5),

			db
				.select({
					type: orders.type,
					count: sql<number>`count(*)`
				})
				.from(orders)
				.where(eq(orders.tenantId, tenantId))
				.groupBy(orders.type)
		]);

	const recentOrders = await db.query.orders.findMany({
		where: eq(orders.tenantId, tenantId),
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
		stripeConnected: !!locals.tenant?.stripeSecretKey,
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
