import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { catalogItems, catalogCategories } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params }) => {
	const vendorId = locals.vendorId!;

	const [categories, items] = await Promise.all([
		db.query.catalogCategories.findMany({
			where: and(eq(catalogCategories.vendorId, vendorId), ne(catalogCategories.isActive, false)),
			orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)]
		}),
		db.query.catalogItems.findMany({
			where: and(
				eq(catalogItems.vendorId, vendorId),
				inArray(catalogItems.status, ['available', 'sold_out'])
			),
			orderBy: (i, { asc }) => [asc(i.sortOrder), asc(i.name)],
			columns: {
				id: true,
				name: true,
				description: true,
				price: true,
				discountedPrice: true,
				images: true,
				tags: true,
				categoryId: true,
				isSubscription: true,
				billingInterval: true,
				status: true
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
		vendorSlug: params.vendorSlug
	};
};
