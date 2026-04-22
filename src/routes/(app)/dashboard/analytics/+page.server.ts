import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { orders, orderItems } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;

	const now = new Date();
	const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const startOfPrev30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
	const startOf7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const [recentOrders, prev30Orders, topItems, statusBreakdown, typeBreakdown] = await Promise.all([
		// All paid orders in last 30 days (full rows for chart + KPIs)
		db.query.orders.findMany({
			where: and(
				eq(orders.tenantId, tenantId),
				eq(orders.paymentStatus, 'paid'),
				gte(orders.createdAt, startOf30Days)
			),
			columns: { id: true, total: true, type: true, status: true, createdAt: true },
			orderBy: [orders.createdAt]
		}),

		// Previous 30-day window for comparison
		db.query.orders.findMany({
			where: and(
				eq(orders.tenantId, tenantId),
				eq(orders.paymentStatus, 'paid'),
				gte(orders.createdAt, startOfPrev30Days),
				sql`${orders.createdAt} < ${startOf30Days}`
			),
			columns: { id: true, total: true }
		}),

		// Top 5 items by quantity ordered (all time)
		db
			.select({
				name: orderItems.name,
				totalQty: sql<number>`cast(sum(${orderItems.quantity}) as int)`,
				totalRevenue: sql<number>`cast(sum(${orderItems.quantity} * ${orderItems.unitPrice}) as int)`
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.where(and(eq(orders.tenantId, tenantId), eq(orders.paymentStatus, 'paid')))
			.groupBy(orderItems.name)
			.orderBy(desc(sql`sum(${orderItems.quantity})`))
			.limit(5),

		// Order count by status (last 30 days, all payment statuses)
		db
			.select({
				status: orders.status,
				count: sql<number>`cast(count(*) as int)`
			})
			.from(orders)
			.where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, startOf30Days)))
			.groupBy(orders.status),

		// Order count by type (last 30 days, paid only)
		db
			.select({
				type: orders.type,
				count: sql<number>`cast(count(*) as int)`,
				revenue: sql<number>`cast(sum(${orders.total}) as int)`
			})
			.from(orders)
			.where(
				and(
					eq(orders.tenantId, tenantId),
					eq(orders.paymentStatus, 'paid'),
					gte(orders.createdAt, startOf30Days)
				)
			)
			.groupBy(orders.type)
	]);

	// ── KPI calculations ────────────────────────────────────────────
	const revenue30 = recentOrders.reduce((s, o) => s + o.total, 0);
	const revenuePrev30 = prev30Orders.reduce((s, o) => s + o.total, 0);
	const revenueChange =
		revenuePrev30 > 0 ? ((revenue30 - revenuePrev30) / revenuePrev30) * 100 : null;

	const orders30 = recentOrders.length;
	const ordersPrev30 = prev30Orders.length;
	const ordersChange = ordersPrev30 > 0 ? ((orders30 - ordersPrev30) / ordersPrev30) * 100 : null;

	const avgOrderValue = orders30 > 0 ? Math.round(revenue30 / orders30) : 0;
	const avgPrev = ordersPrev30 > 0 ? Math.round(revenuePrev30 / ordersPrev30) : 0;
	const avgChange = avgPrev > 0 ? ((avgOrderValue - avgPrev) / avgPrev) * 100 : null;

	const revenue7 = recentOrders
		.filter((o) => new Date(o.createdAt) >= startOf7Days)
		.reduce((s, o) => s + o.total, 0);

	// ── Daily chart data (last 30 days) ─────────────────────────────
	const dailyMap = new Map<string, { revenue: number; count: number }>();
	for (let i = 29; i >= 0; i--) {
		const d = new Date(now);
		d.setDate(d.getDate() - i);
		const key = d.toISOString().slice(0, 10);
		dailyMap.set(key, { revenue: 0, count: 0 });
	}
	for (const o of recentOrders) {
		const key = new Date(o.createdAt).toISOString().slice(0, 10);
		const entry = dailyMap.get(key);
		if (entry) {
			entry.revenue += o.total;
			entry.count += 1;
		}
	}
	const dailyData = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));

	return {
		kpis: {
			revenue30,
			revenuePrev30,
			revenueChange,
			orders30,
			ordersPrev30,
			ordersChange,
			avgOrderValue,
			avgChange,
			revenue7
		},
		dailyData,
		topItems,
		statusBreakdown,
		typeBreakdown
	};
};
