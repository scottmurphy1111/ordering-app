import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { and, eq, desc, sql } from 'drizzle-orm';
import { catalogCategories, catalogItems } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;

	const categories = await db
		.select({
			id: catalogCategories.id,
			name: catalogCategories.name,
			description: catalogCategories.description,
			sortOrder: catalogCategories.sortOrder,
			isActive: catalogCategories.isActive,
			createdAt: catalogCategories.createdAt,
			itemCount: sql<number>`count(${catalogItems.id})`
		})
		.from(catalogCategories)
		.leftJoin(catalogItems, eq(catalogItems.categoryId, catalogCategories.id))
		.where(eq(catalogCategories.vendorId, vendorId))
		.groupBy(catalogCategories.id)
		.orderBy(catalogCategories.sortOrder, desc(catalogCategories.createdAt));

	return { categories };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim() || null;
		const isActive = formData.get('isActive') === 'on';

		if (!name) return fail(400, { error: 'Category name is required' });

		await db.insert(catalogCategories).values({ vendorId, name, description, isActive });
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid ID' });

		await db
			.delete(catalogCategories)
			.where(and(eq(catalogCategories.id, id), eq(catalogCategories.vendorId, vendorId)));
		return { success: true };
	},

	toggleActive: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const current = formData.get('isActive') === 'true';
		if (isNaN(id)) return fail(400, { error: 'Invalid ID' });

		await db
			.update(catalogCategories)
			.set({ isActive: !current })
			.where(and(eq(catalogCategories.id, id), eq(catalogCategories.vendorId, vendorId)));
		return { success: true };
	}
};
