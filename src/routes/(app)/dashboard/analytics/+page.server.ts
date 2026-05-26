import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, ne, and, gte, sql, desc, inArray } from 'drizzle-orm';
import {
	orders,
	orderItems,
	catalogItems,
	catalogCategories,
	pickupWindows
} from '$lib/server/db/schema';
import { effectiveHasAddon } from '$lib/billing';
import { resolveRange } from '$lib/server/analytics-range';

export const load: PageServerLoad = async ({ locals, url }) => {
	const vendorId = locals.vendorId!;
	const hasAdvancedAnalytics = effectiveHasAddon(
		locals.vendor?.subscriptionTier ?? 'starter',
		locals.vendor?.addons,
		'analytics'
	);

	const { startOfRange, endOfRange, rangeDays } = resolveRange(url.searchParams);

	// UI-facing mode metadata: tabs show "preset" state; custom date pickers show "custom" state.
	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');
	const rangeStr = url.searchParams.get('range');
	const isValidDateStr = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
	const isCustom = isValidDateStr(fromParam) && isValidDateStr(toParam) && fromParam <= toParam;
	const rangeMode: 'preset' | 'custom' = isCustom ? 'custom' : 'preset';
	const presetDays: 7 | 30 | 90 | null = isCustom
		? null
		: rangeStr === '7'
			? 7
			: rangeStr === '90'
				? 90
				: 30;

	const startOfPrevRange = new Date(startOfRange.getTime() - rangeDays * 24 * 60 * 60 * 1000);

	const [
		recentOrders,
		prevOrders,
		topItems,
		statusBreakdown,
		typeBreakdown,
		itemsProducedResult,
		itemsProducedPrevResult
	] = await Promise.all([
		db.query.orders.findMany({
			where: and(
				eq(orders.vendorId, vendorId),
				eq(orders.paymentStatus, 'paid'),
				gte(orders.createdAt, startOfRange),
				sql`${orders.createdAt} <= ${endOfRange}`
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
			columns: { id: true, total: true, status: true, createdAt: true }
		}),

		db
			.select({
				name: orderItems.name,
				totalQty: sql<number>`cast(sum(${orderItems.quantity}) as int)`,
				totalRevenue: sql<number>`cast(sum(${orderItems.quantity} * ${orderItems.unitPrice}) as int)`
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.where(
				and(
					eq(orders.vendorId, vendorId),
					eq(orders.paymentStatus, 'paid'),
					gte(orders.createdAt, startOfRange),
					sql`${orders.createdAt} <= ${endOfRange}`
				)
			)
			.groupBy(orderItems.name)
			.orderBy(desc(sql`sum(${orderItems.quantity})`))
			.limit(5),

		db
			.select({
				status: orders.status,
				count: sql<number>`cast(count(*) as int)`
			})
			.from(orders)
			.where(
				and(
					eq(orders.vendorId, vendorId),
					gte(orders.createdAt, startOfRange),
					sql`${orders.createdAt} <= ${endOfRange}`
				)
			)
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
					gte(orders.createdAt, startOfRange),
					sql`${orders.createdAt} <= ${endOfRange}`
				)
			)
			.groupBy(orders.type),

		db
			.select({
				totalItems: sql<number>`cast(coalesce(sum(${orderItems.quantity}), 0) as int)`
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.where(
				and(
					eq(orders.vendorId, vendorId),
					eq(orders.paymentStatus, 'paid'),
					ne(orders.status, 'cancelled' as typeof orders.status._.data),
					gte(orders.createdAt, startOfRange),
					sql`${orders.createdAt} <= ${endOfRange}`
				)
			),

		db
			.select({
				totalItems: sql<number>`cast(coalesce(sum(${orderItems.quantity}), 0) as int)`
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.where(
				and(
					eq(orders.vendorId, vendorId),
					eq(orders.paymentStatus, 'paid'),
					ne(orders.status, 'cancelled' as typeof orders.status._.data),
					gte(orders.createdAt, startOfPrevRange),
					sql`${orders.createdAt} < ${startOfRange}`
				)
			)
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

	const itemsProduced = itemsProducedResult[0]?.totalItems ?? 0;
	const itemsProducedPrev = itemsProducedPrevResult[0]?.totalItems ?? 0;
	const itemsProducedChange =
		itemsProducedPrev > 0 ? ((itemsProduced - itemsProducedPrev) / itemsProducedPrev) * 100 : null;

	// ── Daily chart data ─────────────────────────────────────────────
	// Pre-seed one entry per calendar day in the range so empty days render as zero-height bars.
	// Day-stepping via `+= dayMs` is UTC-correct; the toISOString key is UTC. DST shifts in
	// non-UTC display zones could drift the bucket by ±1 day at boundaries — acceptable pre-launch.
	const dailyMap = new Map<string, { revenue: number; count: number }>();
	const dayMs = 24 * 60 * 60 * 1000;
	const startDayUtc = Date.UTC(
		startOfRange.getUTCFullYear(),
		startOfRange.getUTCMonth(),
		startOfRange.getUTCDate()
	);
	const endDayUtc = Date.UTC(
		endOfRange.getUTCFullYear(),
		endOfRange.getUTCMonth(),
		endOfRange.getUTCDate()
	);
	for (let d = startDayUtc; d <= endDayUtc; d += dayMs) {
		const key = new Date(d).toISOString().slice(0, 10);
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

	// ── Previous-period daily data (for chart overlay) ──────────────
	const dailyMapPrev = new Map<string, { revenue: number; count: number }>();
	const startPrevDayUtc = Date.UTC(
		startOfPrevRange.getUTCFullYear(),
		startOfPrevRange.getUTCMonth(),
		startOfPrevRange.getUTCDate()
	);
	// End the prior bucket the day BEFORE startOfRange begins.
	const endPrevDayUtc = Date.UTC(
		startOfRange.getUTCFullYear(),
		startOfRange.getUTCMonth(),
		startOfRange.getUTCDate() - 1
	);
	for (let d = startPrevDayUtc; d <= endPrevDayUtc; d += dayMs) {
		const key = new Date(d).toISOString().slice(0, 10);
		dailyMapPrev.set(key, { revenue: 0, count: 0 });
	}
	for (const o of prevOrders) {
		const key = new Date(o.createdAt).toISOString().slice(0, 10);
		const entry = dailyMapPrev.get(key);
		if (entry) {
			entry.revenue += o.total;
			entry.count += 1;
		}
	}
	const dailyDataPrev = Array.from(dailyMapPrev.entries()).map(([date, v]) => ({
		date,
		...v
	}));

	// Compact projection for client-side status filtering. Just the fields the
	// filter needs to recompute per-day buckets without re-running the full query.
	const recentOrdersForFilter = recentOrders.map((o) => ({
		id: o.id,
		total: o.total,
		status: o.status,
		date: new Date(o.createdAt).toISOString().slice(0, 10)
	}));

	// ── Top items: prior-period totals for the names in current top 5 ──
	// Runs after Promise.all because it depends on knowing the current top 5 names.
	// Cheap: at most 5 names × prior range × paid orders.
	const topItemNames = topItems.map((i) => i.name);

	let topItemsPrev: Array<{ name: string; totalQty: number; totalRevenue: number }> = [];
	if (topItemNames.length > 0) {
		topItemsPrev = await db
			.select({
				name: orderItems.name,
				totalQty: sql<number>`cast(coalesce(sum(${orderItems.quantity}), 0) as int)`,
				totalRevenue: sql<number>`cast(coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0) as int)`
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.where(
				and(
					eq(orders.vendorId, vendorId),
					eq(orders.paymentStatus, 'paid'),
					gte(orders.createdAt, startOfPrevRange),
					sql`${orders.createdAt} < ${startOfRange}`,
					inArray(orderItems.name, topItemNames)
				)
			)
			.groupBy(orderItems.name);
	}

	// ── Advanced analytics ───────────────────────────────────────────
	let peakHoursGrid: Array<{
		dow: number;
		hour: number;
		count: number;
		revenue: number;
	}> | null = null;
	let customerRetention: { total: number; returning: number; returnRate: number } | null = null;
	let topItemsByRevenue: typeof topItems | null = null;
	let busiestWindow: {
		windowId: number;
		name: string;
		startsAt: Date;
		orderCount: number;
		totalRevenue: number;
	} | null = null;
	let leadTime: { avgLeadSeconds: number; sampleSize: number } | null = null;
	let cancellationTrend: { current: number; prior: number } | null = null;
	let revenueByCategory: Array<{
		category: string;
		totalRevenue: number;
		totalQty: number;
	}> | null = null;

	if (hasAdvancedAnalytics) {
		const [
			peakHoursRaw,
			customerData,
			topByRevenue,
			busiestWindowRows,
			leadTimeRows,
			cancelledCurrentRows,
			cancelledPriorRows,
			revByCategoryRaw
		] = await Promise.all([
			db
				.select({
					dow: sql<number>`cast(EXTRACT(DOW FROM ${orders.createdAt}) as int)`,
					hour: sql<number>`cast(EXTRACT(HOUR FROM ${orders.createdAt}) as int)`,
					count: sql<number>`cast(count(*) as int)`,
					revenue: sql<number>`cast(coalesce(sum(${orders.total}), 0) as int)`
				})
				.from(orders)
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.paymentStatus, 'paid'),
						gte(orders.createdAt, startOfRange),
						sql`${orders.createdAt} <= ${endOfRange}`
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
						sql`${orders.customerEmail} is not null`,
						gte(orders.createdAt, startOfRange),
						sql`${orders.createdAt} <= ${endOfRange}`
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
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.paymentStatus, 'paid'),
						gte(orders.createdAt, startOfRange),
						sql`${orders.createdAt} <= ${endOfRange}`
					)
				)
				.groupBy(orderItems.name)
				.orderBy(desc(sql`sum(${orderItems.quantity} * ${orderItems.unitPrice})`))
				.limit(5),

			// Busiest pickup window for active range: top window by order count.
			db
				.select({
					windowId: pickupWindows.id,
					name: pickupWindows.name,
					startsAt: pickupWindows.startsAt,
					orderCount: sql<number>`cast(count(*) as int)`,
					totalRevenue: sql<number>`cast(coalesce(sum(${orders.total}), 0) as int)`
				})
				.from(orders)
				.innerJoin(pickupWindows, eq(orders.pickupWindowId, pickupWindows.id))
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.paymentStatus, 'paid'),
						gte(orders.createdAt, startOfRange),
						sql`${orders.createdAt} <= ${endOfRange}`
					)
				)
				.groupBy(pickupWindows.id, pickupWindows.name, pickupWindows.startsAt)
				.orderBy(desc(sql`count(*)`))
				.limit(1),

			// Average scheduled lead time = COALESCE(scheduled_for, windows.starts_at) - created_at.
			db
				.select({
					avgLeadSeconds: sql<number>`cast(coalesce(avg(
						extract(epoch from (coalesce(${orders.scheduledFor}, ${pickupWindows.startsAt}) - ${orders.createdAt}))
					), 0) as double precision)`,
					sampleSize: sql<number>`cast(count(case when ${orders.scheduledFor} is not null or ${pickupWindows.startsAt} is not null then 1 end) as int)`
				})
				.from(orders)
				.leftJoin(pickupWindows, eq(orders.pickupWindowId, pickupWindows.id))
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.paymentStatus, 'paid'),
						gte(orders.createdAt, startOfRange),
						sql`${orders.createdAt} <= ${endOfRange}`,
						sql`(${orders.scheduledFor} is not null or ${pickupWindows.startsAt} is not null)`
					)
				),

			// Cancelled count, current range
			db
				.select({
					cancelled: sql<number>`cast(count(*) as int)`
				})
				.from(orders)
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.status, 'cancelled'),
						gte(orders.createdAt, startOfRange),
						sql`${orders.createdAt} <= ${endOfRange}`
					)
				),

			// Cancelled count, prior range
			db
				.select({
					cancelled: sql<number>`cast(count(*) as int)`
				})
				.from(orders)
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.status, 'cancelled'),
						gte(orders.createdAt, startOfPrevRange),
						sql`${orders.createdAt} < ${startOfRange}`
					)
				),

			// Revenue by category — range-scoped. Rows with catalog_item_id IS NULL
			// (quote-derived "Custom order" rows) bucket into "Special orders" rather
			// than "Uncategorized" (which is the genuine catalog configuration gap).
			db
				.select({
					category: sql<string>`coalesce(${catalogCategories.name}, case when ${orderItems.catalogItemId} is null then 'Special orders' else 'Uncategorized' end)`,
					totalRevenue: sql<number>`cast(sum(${orderItems.quantity} * ${orderItems.unitPrice}) as int)`,
					totalQty: sql<number>`cast(sum(${orderItems.quantity}) as int)`
				})
				.from(orderItems)
				.innerJoin(orders, eq(orderItems.orderId, orders.id))
				.leftJoin(catalogItems, eq(orderItems.catalogItemId, catalogItems.id))
				.leftJoin(catalogCategories, eq(catalogItems.categoryId, catalogCategories.id))
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.paymentStatus, 'paid'),
						gte(orders.createdAt, startOfRange),
						sql`${orders.createdAt} <= ${endOfRange}`
					)
				)
				.groupBy(
					sql`coalesce(${catalogCategories.name}, case when ${orderItems.catalogItemId} is null then 'Special orders' else 'Uncategorized' end)`
				)
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
		busiestWindow = busiestWindowRows[0] ?? null;
		leadTime = leadTimeRows[0] ?? null;
		cancellationTrend = {
			current: cancelledCurrentRows[0]?.cancelled ?? 0,
			prior: cancelledPriorRows[0]?.cancelled ?? 0
		};
		revenueByCategory = revByCategoryRaw;
	}

	return {
		rangeDays,
		rangeMode,
		presetDays,
		fromDate: rangeMode === 'custom' ? fromParam : null,
		toDate: rangeMode === 'custom' ? toParam : null,
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
			fulfilledRate,
			itemsProduced,
			itemsProducedChange
		},
		dailyData,
		dailyDataPrev,
		recentOrdersForFilter,
		topItems,
		topItemsPrev,
		statusBreakdown,
		typeBreakdown,
		peakHoursGrid,
		customerRetention,
		topItemsByRevenue,
		revenueByCategory,
		busiestWindow,
		leadTime,
		cancellationTrend
	};
};
