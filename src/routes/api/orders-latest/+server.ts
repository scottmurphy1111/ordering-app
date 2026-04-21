import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { orders } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.tenantId) throw error(401, 'Unauthorized');

	const latest = await db.query.orders.findFirst({
		where: eq(orders.tenantId, locals.tenantId),
		orderBy: [desc(orders.id)],
		columns: { id: true, orderNumber: true, customerName: true, total: true }
	});

	return json({ latestId: latest?.id ?? 0, order: latest ?? null });
};
