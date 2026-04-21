import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { orders } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.tenantId) throw error(401, 'Unauthorized');

	// Only consider paid orders — an order record is created before the customer
	// completes Stripe checkout, so filtering on paymentStatus prevents the chime
	// firing for abandoned carts.
	const latest = await db.query.orders.findFirst({
		where: and(
			eq(orders.tenantId, locals.tenantId),
			eq(orders.paymentStatus, 'paid')
		),
		orderBy: [desc(orders.id)],
		columns: { id: true, orderNumber: true, customerName: true, total: true }
	});

	return json({ latestId: latest?.id ?? 0, order: latest ?? null });
};
