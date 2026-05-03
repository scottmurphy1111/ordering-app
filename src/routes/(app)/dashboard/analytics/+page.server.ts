import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { orders, orderItems, catalogItems, catalogCategories } from '$lib/server/db/schema';
import { hasAddon } from '$lib/billing';

export const load: PageServerLoad = async ({ locals, url }) => {
	const vendorId = locals.vendorId!;
	const hasAdvancedAnalytics = hasAddon(locals.vendor?.addons, 'analytics');

	const rangeStr = url.searchParams.get('range');
	const rangeDays = rangeStr === '7' ? 7 : 30;

	const now = new Date();
	const startOfRange = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
	const startOfPrevRange = new Date(now.getTime() - 2 * rangeDays * 24 * 60 * 60 * 1000);
	const startOf90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

	const [recentOrders, prevOrders, topItems, statusBreakdown, typeBreakdown] = await Promise.all([
		db.query.orders.findMany({
			where: and(
				eq(orders.vendorId, vendorId),
				eq(orders.paymentStatus, 'paid'),
				gte(orders.createdAt, startOfRange)
			),
			columns: { id: true, total: true, type: true, status: true, createdAt: true },
			orderBy: [orders.createdAt]
		}),

		db.query.orders.findMany({
			where: and(
				eq(orders.vendorId, vendorId),
				eq(orders.paymentStatus, 'paid'),
				gte(orders.createdAt, startOfPrevRange),
				sql`${orders.createdAt} < ${startOfRange}`
			),
			columns: { id: true, total: true }
		}),

		db
			.select({
				name: orderItems.name,
				totalQty: sql<number>`cast(sum(${orderItems.quantity}) as int)`,
				totalRevenue: sql<number>`cast(sum(${orderItems.quantity} * ${orderItems.unitPrice}) as int)`
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.where(and(eq(orders.vendorId, vendorId), eq(orders.paymentStatus, 'paid')))
			.groupBy(orderItems.name)
			.orderBy(desc(sql`sum(${orderItems.quantity})`))
			.limit(5),

		db
			.select({
				status: orders.status,
				count: sql<number>`cast(count(*) as int)`
			})
			.from(orders)
			.where(and(eq(orders.vendorId, vendorId), gte(orders.createdAt, startOfRange)))
			.groupBy(orders.status),

		db
			.select({
				type: orders.type,
				count: sql<number>`cast(count(*) as int)`,
				revenue: sql<number>`cast(sum(${orders.total}) as int)`
			})
			.from(orders)
			.where(
				and(
					eq(orders.vendorId, vendorId),
					eq(orders.paymentStatus, 'paid'),
					gte(orders.createdAt, startOfRange)
				)
			)
			.groupBy(orders.type)
	]);

	// ── KPI calculations ────────────────────────────────────────────
	const revenue = recentOrders.reduce((s, o) => s + o.total, 0);
	const revenuePrev = prevOrders.reduce((s, o) => s + o.total, 0);
	const revenueChange = revenuePrev > 0 ? ((revenue - revenuePrev) / revenuePrev) * 100 : null;

	const ordersCount = recentOrders.length;
	const ordersPrev = prevOrders.length;
	const ordersChange = ordersPrev > 0 ? ((ordersCount - ordersPrev) / ordersPrev) * 100 : null;

	const avgOrderValue = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;
	const avgPrev = ordersPrev > 0 ? Math.round(revenuePrev / ordersPrev) : 0;
	const avgChange = avgPrev > 0 ? ((avgOrderValue - avgPrev) / avgPrev) * 100 : null;

	const fulfilledCount = recentOrders.filter((o) => o.status === 'fulfilled').length;
	const fulfilledRate = ordersCount > 0 ? Math.round((fulfilledCount / ordersCount) * 100) : null;

	// ── Daily chart data ─────────────────────────────────────────────
	const dailyMap = new Map<string, { revenue: number; count: number }>();
	for (let i = rangeDays - 1; i >= 0; i--) {
		const d = new Date(now);
		d.setDate(d.getDate() - i);
		dailyMap.set(d.toISOString().slice(0, 10), { revenue: 0, count: 0 });
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

	// ── Advanced analytics ───────────────────────────────────────────
	let peakHoursGrid: Array<{ dow: number; hour: number; count: number }> | null = null;
	let customerRetention: { total: number; returning: number; returnRate: number } | null = null;
	let topItemsByRevenue: typeof topItems | null = null;
	let revenueByCategory: Array<{
		category: string;
		totalRevenue: number;
		totalQty: number;
	}> | null = null;

	if (hasAdvancedAnalytics) {
		const [peakHoursRaw, customerData, topByRevenue, revByCategoryRaw] = await Promise.all([
			db
				.select({
					dow: sql<number>`cast(EXTRACT(DOW FROM ${orders.createdAt}) as int)`,
					hour: sql<number>`cast(EXTRACT(HOUR FROM ${orders.createdAt}) as int)`,
					count: sql<number>`cast(count(*) as int)`
				})
				.from(orders)
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.paymentStatus, 'paid'),
						gte(orders.createdAt, startOf90Days)
					)
				)
				.groupBy(
					sql`EXTRACT(DOW FROM ${orders.createdAt})`,
					sql`EXTRACT(HOUR FROM ${orders.createdAt})`
				),

			db
				.select({
					customerEmail: orders.customerEmail,
					orderCount: sql<number>`cast(count(*) as int)`
				})
				.from(orders)
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.paymentStatus, 'paid'),
						sql`${orders.customerEmail} is not null`
					)
				)
				.groupBy(orders.customerEmail),

			db
				.select({
					name: orderItems.name,
					totalQty: sql<number>`cast(sum(${orderItems.quantity}) as int)`,
					totalRevenue: sql<number>`cast(sum(${orderItems.quantity} * ${orderItems.unitPrice}) as int)`
				})
				.from(orderItems)
				.innerJoin(orders, eq(orderItems.orderId, orders.id))
				.where(and(eq(orders.vendorId, vendorId), eq(orders.paymentStatus, 'paid')))
				.groupBy(orderItems.name)
				.orderBy(desc(sql`sum(${orderItems.quantity} * ${orderItems.unitPrice})`))
				.limit(5),

			db
				.select({
					category: sql<string>`coalesce(${catalogCategories.name}, 'Uncategorized')`,
					totalRevenue: sql<number>`cast(sum(${orderItems.quantity} * ${orderItems.unitPrice}) as int)`,
					totalQty: sql<number>`cast(sum(${orderItems.quantity}) as int)`
				})
				.from(orderItems)
				.innerJoin(orders, eq(orderItems.orderId, orders.id))
				.leftJoin(catalogItems, eq(orderItems.catalogItemId, catalogItems.id))
				.leftJoin(catalogCategories, eq(catalogItems.categoryId, catalogCategories.id))
				.where(and(eq(orders.vendorId, vendorId), eq(orders.paymentStatus, 'paid')))
				.groupBy(sql`coalesce(${catalogCategories.name}, 'Uncategorized')`)
				.orderBy(desc(sql`sum(${orderItems.quantity} * ${orderItems.unitPrice})`))
				.limit(6)
		]);

		peakHoursGrid = peakHoursRaw;

		const total = customerData.length;
		const returning = customerData.filter((c) => c.orderCount > 1).length;
		customerRetention = {
			total,
			returning,
			returnRate: total > 0 ? Math.round((returning / total) * 100) : 0
		};

		topItemsByRevenue = topByRevenue;
		revenueByCategory = revByCategoryRaw;
	}

	return {
		rangeDays,
		hasAdvancedAnalytics,
		kpis: {
			revenue,
			revenuePrev,
			revenueChange,
			ordersCount,
			ordersPrev,
			ordersChange,
			avgOrderValue,
			avgChange,
			fulfilledRate
		},
		dailyData,
		topItems,
		statusBreakdown,
		typeBreakdown,
		peakHoursGrid,
		customerRetention,
		topItemsByRevenue,
		revenueByCategory
	};
};
