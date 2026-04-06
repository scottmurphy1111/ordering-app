import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireTenant } from '$lib/server/tenant';
import { menuItems } from '$lib/server/db/schema';

export const load: LayoutServerLoad = async (event) => {
	const tenantId = requireTenant(event); // throws if no tenant

	const items = await db.query.menuItems.findMany({
		where: eq(menuItems.tenantId, tenantId)
		// add ordering, limits, etc.
	});

	return { items };
};
