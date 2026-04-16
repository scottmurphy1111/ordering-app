import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, desc, sql } from 'drizzle-orm';
import { menuCategories, menuItems } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;

	const categories = await db
		.select({
			id: menuCategories.id,
			name: menuCategories.name,
			description: menuCategories.description,
			sortOrder: menuCategories.sortOrder,
			isActive: menuCategories.isActive,
			createdAt: menuCategories.createdAt,
			itemCount: sql<number>`count(${menuItems.id})`
		})
		.from(menuCategories)
		.leftJoin(menuItems, eq(menuItems.categoryId, menuCategories.id))
		.where(eq(menuCategories.tenantId, tenantId))
		.groupBy(menuCategories.id)
		.orderBy(menuCategories.sortOrder, desc(menuCategories.createdAt));

	return { categories };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim() || null;

		if (!name) return fail(400, { error: 'Category name is required' });

		await db.insert(menuCategories).values({ tenantId, name, description, isActive: true });
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid ID' });

		await db
			.delete(menuCategories)
			.where(eq(menuCategories.id, id) && eq(menuCategories.tenantId, tenantId));
		return { success: true };
	},

	toggleActive: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const current = formData.get('isActive') === 'true';
		if (isNaN(id)) return fail(400, { error: 'Invalid ID' });

		await db
			.update(menuCategories)
			.set({ isActive: !current })
			.where(eq(menuCategories.id, id) && eq(menuCategories.tenantId, tenantId));
		return { success: true };
	}
};
