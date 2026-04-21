import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, and, ne } from 'drizzle-orm';
import { menuItems, menuCategories } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params }) => {
	const tenantId = locals.tenantId!;


	const [categories, items] = await Promise.all([
		db.query.menuCategories.findMany({
			where: and(eq(menuCategories.tenantId, tenantId), ne(menuCategories.isActive, false)),
			orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)]
		}),
		db.query.menuItems.findMany({
			where: and(eq(menuItems.tenantId, tenantId), eq(menuItems.available, true)),
			orderBy: (i, { asc }) => [asc(i.sortOrder), asc(i.name)],
			columns: {
				id: true,
				name: true,
				description: true,
				price: true,
				discountedPrice: true,
				images: true,
				tags: true,
				categoryId: true
			},
			with: {
				modifiers: { columns: { modifierId: true } }
			}
		})
	]);

	// Group items by category
	const itemsByCategory = new Map<number | null, typeof items>();
	for (const item of items) {
		const key = item.categoryId ?? null;
		if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
		itemsByCategory.get(key)!.push(item);
	}

	return {
		categories,
		items,
		itemsByCategory: Object.fromEntries(itemsByCategory),
		tenantSlug: params.tenantSlug
	};
};
