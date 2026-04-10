import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, sql, and } from 'drizzle-orm';
import { menuItems, menuCategories, orders } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;

	const [itemCount, categoryCount, orderStats] = await Promise.all([
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
			.where(eq(orders.tenantId, tenantId))
	]);

	// Recent orders
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
		stats: {
			items: Number(itemCount[0]?.count ?? 0),
			categories: Number(categoryCount[0]?.count ?? 0),
			orders: Number(orderStats[0]?.total ?? 0),
			revenue: Number(orderStats[0]?.revenue ?? 0),
			pendingOrders: Number(orderStats[0]?.pending ?? 0)
		},
		recentOrders
	};
};
