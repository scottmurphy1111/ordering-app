import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, inArray } from 'drizzle-orm';
import { modifierOptions, modifiers } from '$lib/server/db/schema';

export async function POST(event: RequestEvent) {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	if (!event.locals.vendorId) throw error(400, 'No vendor selected');

	const vendorId = event.locals.vendorId;
	const body = await event.request.json();
	const order: { id: number; sortOrder: number }[] = body.order;

	if (!Array.isArray(order) || order.length === 0) throw error(400, 'Invalid payload');

	// Authorization: all option ids must belong to a modifier owned by this vendor.
	const ids = order.map((o) => o.id);
	const owned = await db
		.select({ id: modifierOptions.id })
		.from(modifierOptions)
		.innerJoin(modifiers, eq(modifierOptions.modifierId, modifiers.id))
		.where(and(inArray(modifierOptions.id, ids), eq(modifiers.vendorId, vendorId)));

	if (owned.length !== ids.length) throw error(403, 'Some options do not belong to this vendor');

	await Promise.all(
		order.map(({ id, sortOrder }) =>
			db.update(modifierOptions).set({ sortOrder }).where(eq(modifierOptions.id, id))
		)
	);

	return json({ success: true });
}
