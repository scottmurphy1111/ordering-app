import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { orders, orderItems } from '$lib/server/db/orders';

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	depends('app:order-status');
	const tenantId = locals.tenantId!;
	const orderId = parseInt(params.orderId);

	if (isNaN(orderId)) throw error(404, 'Order not found');

	const order = await db.query.orders.findFirst({
		where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId))
	});

	if (!order) throw error(404, 'Order not found');

	const items = await db.query.orderItems.findMany({
		where: eq(orderItems.orderId, orderId)
	});

	return { order, items, tenantSlug: params.tenantSlug };
};
