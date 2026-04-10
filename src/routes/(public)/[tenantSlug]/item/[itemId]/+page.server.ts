import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { menuItems } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params }) => {
	const tenantId = locals.tenantId!;
	const itemId = parseInt(params.itemId);

	if (isNaN(itemId)) throw error(404, 'Item not found');

	const item = await db.query.menuItems.findFirst({
		where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId), eq(menuItems.available, true))
	});

	if (!item) throw error(404, 'Item not found');

	return { item, tenantSlug: params.tenantSlug };
};
