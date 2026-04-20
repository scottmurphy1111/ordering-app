import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { menuItems } from '$lib/server/db/schema';

export async function POST(event: RequestEvent) {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	if (!event.locals.tenantId) throw error(400, 'No tenant selected');

	const tenantId = event.locals.tenantId;
	const body = await event.request.json();
	const order: { id: number; sortOrder: number }[] = body.order;

	if (!Array.isArray(order)) throw error(400, 'Invalid payload');

	await Promise.all(
		order.map(({ id, sortOrder }) =>
			db
				.update(menuItems)
				.set({ sortOrder })
				.where(and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)))
		)
	);

	return json({ success: true });
}
