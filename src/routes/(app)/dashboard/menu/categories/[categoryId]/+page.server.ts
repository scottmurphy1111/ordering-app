import type { PageServerLoad, Actions } from './$types';
import { fail, redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { menuCategories, menuItems } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params }) => {
	const tenantId = locals.tenantId!;
	const categoryId = parseInt(params.categoryId);
	if (isNaN(categoryId)) throw error(404, 'Not found');

	const [category, items] = await Promise.all([
		db.query.menuCategories.findFirst({
			where: and(eq(menuCategories.id, categoryId), eq(menuCategories.tenantId, tenantId))
		}),
		db.query.menuItems.findMany({
			where: eq(menuItems.tenantId, tenantId),
			columns: { id: true, name: true, categoryId: true, price: true },
			orderBy: (i, { asc }) => [asc(i.name)]
		})
	]);

	if (!category) throw error(404, 'Category not found');

	return { category, items };
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const tenantId = locals.tenantId!;
		const categoryId = parseInt(params.categoryId);
		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim() || null;
		const sortOrder = parseInt(formData.get('sortOrder')?.toString() ?? '0') || 0;
		const isActive = formData.get('isActive') === 'on';

		if (!name) return fail(400, { error: 'Name is required' });

		await db
			.update(menuCategories)
			.set({ name, description, sortOrder, isActive })
			.where(and(eq(menuCategories.id, categoryId), eq(menuCategories.tenantId, tenantId)));

		return { success: true };
	},

	assignItems: async ({ request, locals, params }) => {
		const tenantId = locals.tenantId!;
		const categoryId = parseInt(params.categoryId);
		const formData = await request.formData();

		// Selected item IDs to assign to this category
		const selectedIds = formData.getAll('itemId').map((v) => parseInt(v.toString()));

		// Get all items for this tenant
		const allItems = await db.query.menuItems.findMany({
			where: eq(menuItems.tenantId, tenantId),
			columns: { id: true, categoryId: true }
		});

		// Assign selected items to this category; remove this category from deselected items
		await Promise.all(
			allItems.map((item) => {
				const shouldBeInCategory = selectedIds.includes(item.id);
				const isCurrentlyInCategory = item.categoryId === categoryId;

				if (shouldBeInCategory && !isCurrentlyInCategory) {
					return db
						.update(menuItems)
						.set({ categoryId })
						.where(and(eq(menuItems.id, item.id), eq(menuItems.tenantId, tenantId)));
				} else if (!shouldBeInCategory && isCurrentlyInCategory) {
					return db
						.update(menuItems)
						.set({ categoryId: null })
						.where(and(eq(menuItems.id, item.id), eq(menuItems.tenantId, tenantId)));
				}
			})
		);

		return { success: true };
	}
};
