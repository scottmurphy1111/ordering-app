import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { catalogCategories } from '$lib/server/db/schema';

export async function POST(event: RequestEvent) {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	if (!event.locals.vendorId) throw error(400, 'No vendor selected');

	const vendorId = event.locals.vendorId;
	const body = await event.request.json();
	const order: { id: number; sortOrder: number }[] = body.order;

	if (!Array.isArray(order)) throw error(400, 'Invalid payload');

	await Promise.all(
		order.map(({ id, sortOrder }) =>
			db
				.update(catalogCategories)
				.set({ sortOrder })
				.where(and(eq(catalogCategories.id, id), eq(catalogCategories.vendorId, vendorId)))
		)
	);

	return json({ success: true });
}
