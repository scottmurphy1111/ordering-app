import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import { menuItems, menuCategories } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;

	const [itemCount, categoryCount] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)` })
			.from(menuItems)
			.where(eq(menuItems.tenantId, tenantId)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(menuCategories)
			.where(eq(menuCategories.tenantId, tenantId))
	]);

	return {
		itemCount: Number(itemCount[0]?.count ?? 0),
		categoryCount: Number(categoryCount[0]?.count ?? 0)
	};
};
