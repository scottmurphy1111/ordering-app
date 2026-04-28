import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { catalogCategories, catalogItems } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params }) => {
	const vendorId = locals.vendorId!;
	const categoryId = parseInt(params.categoryId);
	if (isNaN(categoryId)) throw error(404, 'Not found');

	const [category, items] = await Promise.all([
		db.query.catalogCategories.findFirst({
			where: and(eq(catalogCategories.id, categoryId), eq(catalogCategories.vendorId, vendorId))
		}),
		db.query.catalogItems.findMany({
			where: eq(catalogItems.vendorId, vendorId),
			columns: { id: true, name: true, categoryId: true, price: true },
			orderBy: (i, { asc }) => [asc(i.name)]
		})
	]);

	if (!category) throw error(404, 'Category not found');

	return { category, items };
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const vendorId = locals.vendorId!;
		const categoryId = parseInt(params.categoryId);
		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim() || null;
		const sortOrder = parseInt(formData.get('sortOrder')?.toString() ?? '0') || 0;
		const isActive = formData.get('isActive') === 'on';

		if (!name) return fail(400, { error: 'Name is required' });

		await db
			.update(catalogCategories)
			.set({ name, description, sortOrder, isActive })
			.where(and(eq(catalogCategories.id, categoryId), eq(catalogCategories.vendorId, vendorId)));

		return { success: true };
	},

	assignItems: async ({ request, locals, params }) => {
		const vendorId = locals.vendorId!;
		const categoryId = parseInt(params.categoryId);
		const formData = await request.formData();

		const selectedIds = formData.getAll('itemId').map((v) => parseInt(v.toString()));

		const allItems = await db.query.catalogItems.findMany({
			where: eq(catalogItems.vendorId, vendorId),
			columns: { id: true, categoryId: true }
		});

		await Promise.all(
			allItems.map((item) => {
				const shouldBeInCategory = selectedIds.includes(item.id);
				const isCurrentlyInCategory = item.categoryId === categoryId;

				if (shouldBeInCategory && !isCurrentlyInCategory) {
					return db
						.update(catalogItems)
						.set({ categoryId })
						.where(and(eq(catalogItems.id, item.id), eq(catalogItems.vendorId, vendorId)));
				} else if (!shouldBeInCategory && isCurrentlyInCategory) {
					return db
						.update(catalogItems)
						.set({ categoryId: null })
						.where(and(eq(catalogItems.id, item.id), eq(catalogItems.vendorId, vendorId)));
				}
			})
		);

		return { success: true };
	}
};
