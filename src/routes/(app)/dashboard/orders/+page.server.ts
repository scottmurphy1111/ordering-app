import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	eq,
	and,
	asc,
	desc,
	or,
	not,
	ne,
	inArray,
	gte,
	isNotNull,
	isNull,
	sql,
	sum
} from 'drizzle-orm';
import { orders, orderItems } from '$lib/server/db/schema';
import { vendor } from '$lib/server/db/vendor';
import { pickupWindows, pickupLocations } from '$lib/server/db/pickup';
import Stripe from 'stripe';
import { sendEmail } from '$lib/server/email';
import { orderReadyEmail } from '$lib/server/email/templates/orderReady';
import { orderCancelledEmail } from '$lib/server/email/templates/orderCancelled';
import { orderRefundedEmail } from '$lib/server/email/templates/orderRefunded';

const HISTORY_CUTOFF_MS = 24 * 60 * 60 * 1000;

export type WindowGroupKey = {
	windowId: number;
	name: string;
	startsAt: Date;
	endsAt: Date;
	locationName: string | null;
};

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('app:orders');
	const vendorId = locals.vendorId!;
	const view = url.searchParams.get('view') === 'production' ? 'production' : 'orders';
	const showCancelled = url.searchParams.get('cancelled') === 'show';
	const statusFilter = url.searchParams.get('status') ?? '';

	const cutoff = new Date(Date.now() - HISTORY_CUTOFF_MS);
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);

	// Subquery: pickup windows that have not yet ended (today or later)
	const activeWindowIds = db
		.select({ id: pickupWindows.id })
		.from(pickupWindows)
		.where(gte(pickupWindows.endsAt, todayStart));

	// Base conditions: vendor scope + recency window for terminal statuses + active-window filter
	const baseConditions = [
		eq(orders.vendorId, vendorId),
		or(not(inArray(orders.status, ['fulfilled', 'cancelled'])), gte(orders.updatedAt, cutoff))!,
		or(isNull(orders.pickupWindowId), inArray(orders.pickupWindowId, activeWindowIds))!
	];

	// Summary stats fetched for both views
	const [countRows, scheduledRow, todayRevenueRow] = await Promise.all([
		db.query.orders.findMany({ where: and(...baseConditions), columns: { status: true } }),
		db
			.select({ count: sql<number>`count(*)` })
			.from(orders)
			.where(
				and(
					eq(orders.vendorId, vendorId),
					isNotNull(orders.scheduledFor),
					gte(orders.scheduledFor, todayStart),
					or(
						not(inArray(orders.status, ['fulfilled', 'cancelled'])),
						gte(orders.updatedAt, cutoff)
					)!
				)
			),
		db
			.select({ total: sql<number>`coalesce(sum(total), 0)` })
			.from(orders)
			.where(and(eq(orders.vendorId, vendorId), gte(orders.createdAt, todayStart)))
	]);

	const statusCounts = countRows.reduce<Record<string, number>>((acc, o) => {
		acc[o.status] = (acc[o.status] ?? 0) + 1;
		return acc;
	}, {});
	const scheduledCount = Number(scheduledRow[0]?.count ?? 0);
	const todayRevenue = Number(todayRevenueRow[0]?.total ?? 0);

	// ── Production view ────────────────────────────────────────────────────────
	if (view === 'production') {
		// Aggregate orderItems by (window, item name), excluding cancelled orders.
		// INNER JOIN on pickupWindows naturally excludes free-form orders (null FK).
		const productionRows = await db
			.select({
				pickupWindowId: orders.pickupWindowId,
				startsAt: pickupWindows.startsAt,
				endsAt: pickupWindows.endsAt,
				windowName: pickupWindows.name,
				locationName: pickupLocations.name,
				itemName: orderItems.name,
				selectedModifiers: orderItems.selectedModifiers,
				totalQuantity: sum(orderItems.quantity),
				orderCount: sql<number>`count(distinct ${orders.id})`
			})
			.from(orderItems)
			.innerJoin(orders, eq(orderItems.orderId, orders.id))
			.innerJoin(pickupWindows, eq(orders.pickupWindowId, pickupWindows.id))
			.leftJoin(pickupLocations, eq(pickupWindows.locationId, pickupLocations.id))
			.where(
				and(
					eq(orders.vendorId, vendorId),
					ne(orders.status, 'cancelled' as typeof orders.status._.data),
					gte(pickupWindows.endsAt, todayStart)
				)
			)
			.groupBy(
				orders.pickupWindowId,
				pickupWindows.startsAt,
				pickupWindows.endsAt,
				pickupWindows.name,
				pickupLocations.name,
				orderItems.name,
				orderItems.selectedModifiers
			)
			.orderBy(asc(pickupWindows.startsAt), desc(sum(orderItems.quantity)), asc(orderItems.name));

		// Group rows by pickup window
		const productionMap = new Map<
			number,
			{
				window: WindowGroupKey;
				orderCount: number;
				items: Array<{ name: string; modifiers: string[]; totalQuantity: number }>;
			}
		>();

		for (const row of productionRows) {
			const wid = row.pickupWindowId!;
			if (!productionMap.has(wid)) {
				productionMap.set(wid, {
					window: {
						windowId: wid,
						name: row.windowName,
						startsAt: row.startsAt,
						endsAt: row.endsAt,
						locationName: row.locationName ?? null
					},
					orderCount: Number(row.orderCount),
					items: []
				});
			}
			productionMap.get(wid)!.items.push({
				name: row.itemName,
				modifiers: Array.isArray(row.selectedModifiers)
					? (row.selectedModifiers as Array<{ name: string }>).map((m) => m.name)
					: [],
				totalQuantity: parseInt(row.totalQuantity ?? '0')
			});
		}

		return {
			view: 'production' as const,
			showCancelled: false,
			statusFilter,
			statusCounts,
			scheduledCount,
			todayRevenue,
			productionGroups: Array.from(productionMap.values())
		};
	}

	// ── Orders view ───────────────────────────────────────────────────────────
	const whereConditions = [...baseConditions];
	if (!showCancelled) {
		whereConditions.push(ne(orders.status, 'cancelled' as typeof orders.status._.data));
	}
	if (statusFilter) {
		whereConditions.push(eq(orders.status, statusFilter as typeof orders.status._.data));
	}

	const allOrders = await db.query.orders.findMany({
		where: and(...whereConditions),
		orderBy: [asc(orders.createdAt)],
		limit: 50,
		columns: {
			id: true,
			orderNumber: true,
			customerName: true,
			customerPhone: true,
			total: true,
			status: true,
			paymentStatus: true,
			type: true,
			createdAt: true,
			notes: true,
			scheduledFor: true,
			deliveryAddress: true,
			stripePaymentIntentId: true,
			pickupWindowId: true
		},
		with: {
			items: { columns: { name: true, quantity: true } },
			pickupWindow: {
				columns: { id: true, startsAt: true, endsAt: true, name: true },
				with: { location: { columns: { name: true } } }
			}
		}
	});

	// Group orders by pickupWindowId server-side
	const windowMap = new Map<
		number,
		{ window: WindowGroupKey; orders: typeof allOrders; totalRevenue: number }
	>();
	const freeFormOrders: typeof allOrders = [];

	for (const order of allOrders) {
		if (order.pickupWindowId != null && order.pickupWindow != null) {
			const wid = order.pickupWindowId;
			if (!windowMap.has(wid)) {
				windowMap.set(wid, {
					window: {
						windowId: order.pickupWindow.id,
						name: order.pickupWindow.name,
						startsAt: order.pickupWindow.startsAt,
						endsAt: order.pickupWindow.endsAt,
						locationName: order.pickupWindow.location?.name ?? null
					},
					orders: [],
					totalRevenue: 0
				});
			}
			const group = windowMap.get(wid)!;
			group.orders.push(order);
			if (order.status !== 'cancelled') group.totalRevenue += order.total;
		} else {
			freeFormOrders.push(order);
		}
	}

	// Window groups sorted soonest-first
	const windowGroups = Array.from(windowMap.values()).sort(
		(a, b) => a.window.startsAt.getTime() - b.window.startsAt.getTime()
	);

	return {
		view: 'orders' as const,
		showCancelled,
		statusFilter,
		statusCounts,
		scheduledCount,
		todayRevenue,
		windowGroups,
		freeFormOrders
	};
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const status = formData.get('status')?.toString();
		if (isNaN(id) || !status) return fail(400, { error: 'Invalid' });

		const [order] = await db
			.update(orders)
			.set({ status: status as typeof orders.status._.data, updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)))
			.returning();

		if (status === 'ready' && order?.customerEmail) {
			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true }
			});
			if (vendorRecord) {
				await sendEmail({
					to: order.customerEmail,
					subject: `Your order is ready — ${vendorRecord.name}`,
					html: orderReadyEmail({
						tenantName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						total: order.total,
						orderType: order.type
					})
				}).catch(console.error);
			}
		}

		return { success: true };
	},

	cancel: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const [order] = await db
			.update(orders)
			.set({ status: 'cancelled', updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)))
			.returning();

		if (order?.customerEmail) {
			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true }
			});
			if (vendorRecord) {
				await sendEmail({
					to: order.customerEmail,
					subject: `Order ${order.orderNumber} cancelled — ${vendorRecord.name}`,
					html: orderCancelledEmail({
						tenantName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						total: order.total
					})
				}).catch(console.error);
			}
		}

		return { success: true };
	},

	refund: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const [orderRow, vendorRecord] = await Promise.all([
			db.query.orders.findFirst({
				where: and(eq(orders.id, id), eq(orders.vendorId, vendorId))
			}),
			db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { stripeSecretKey: true, name: true, backgroundColor: true }
			})
		]);

		if (!orderRow) return fail(404, { error: 'Order not found' });
		if (orderRow.status !== 'cancelled')
			return fail(400, { error: 'Order must be cancelled before refunding' });
		if (orderRow.paymentStatus !== 'paid') return fail(400, { error: 'Order has not been paid' });
		if (!orderRow.stripePaymentIntentId)
			return fail(400, { error: 'No payment found for this order' });
		if (!vendorRecord?.stripeSecretKey)
			return fail(500, { error: 'Stripe not configured for this vendor' });

		const stripe = new Stripe(vendorRecord.stripeSecretKey);

		let paymentIntentId = orderRow.stripePaymentIntentId;
		if (paymentIntentId.startsWith('cs_')) {
			try {
				const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
				if (!session.payment_intent)
					return fail(400, { error: 'No payment intent found on this session' });
				paymentIntentId =
					typeof session.payment_intent === 'string'
						? session.payment_intent
						: session.payment_intent.id;
			} catch (e: unknown) {
				return fail(502, {
					error: e instanceof Error ? e.message : 'Could not resolve Stripe session'
				});
			}
		}

		try {
			await stripe.refunds.create({ payment_intent: paymentIntentId });
		} catch (e: unknown) {
			return fail(502, { error: e instanceof Error ? e.message : 'Stripe refund failed' });
		}

		const [refundedOrder] = await db
			.update(orders)
			.set({ paymentStatus: 'refunded', updatedAt: new Date() })
			.where(eq(orders.id, id))
			.returning();

		if (refundedOrder?.customerEmail && vendorRecord) {
			await sendEmail({
				to: refundedOrder.customerEmail,
				subject: `Refund processed for order ${refundedOrder.orderNumber} — ${vendorRecord.name}`,
				html: orderRefundedEmail({
					tenantName: vendorRecord.name,
					primaryColor: vendorRecord.backgroundColor ?? undefined,
					orderNumber: refundedOrder.orderNumber,
					customerName: refundedOrder.customerName ?? 'there',
					total: refundedOrder.total
				})
			}).catch(console.error);
		}

		return { success: true };
	}
};
