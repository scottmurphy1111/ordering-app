import type { PageServerLoad, Actions } from './$types';
import { fail, redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { menuItems, menuCategories } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params }) => {
	const tenantId = locals.tenantId!;
	const itemId = parseInt(params.itemId);
	if (isNaN(itemId)) throw error(404, 'Not found');

	const [item, categories] = await Promise.all([
		db.query.menuItems.findFirst({
			where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
			with: { category: { columns: { id: true, name: true } } }
		}),
		db.query.menuCategories.findMany({
			where: eq(menuCategories.tenantId, tenantId),
			columns: { id: true, name: true },
			orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)]
		})
	]);

	if (!item) throw error(404, 'Item not found');
	return { item, categories };
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const tenantId = locals.tenantId!;
		const itemId = parseInt(params.itemId);
		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim() || null;
		const priceStr = formData.get('price')?.toString();
		const discountedPriceStr = formData.get('discountedPrice')?.toString();
		const categoryIdStr = formData.get('categoryId')?.toString();
		const available = formData.get('available') === 'on';
		const tagsRaw = formData.get('tags')?.toString().trim();

		if (!name) return fail(400, { error: 'Name is required' });
		if (!priceStr || isNaN(parseFloat(priceStr))) return fail(400, { error: 'Valid price is required' });

		const price = Math.round(parseFloat(priceStr) * 100);
		const discountedPrice = discountedPriceStr ? Math.round(parseFloat(discountedPriceStr) * 100) : null;
		const categoryId = categoryIdStr ? parseInt(categoryIdStr) : null;
		const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];

		await db
			.update(menuItems)
			.set({ name, description, price, discountedPrice, categoryId, available, tags, updatedAt: new Date() })
			.where(and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)));

		return { success: true };
	},

	delete: async ({ locals, params }) => {
		const tenantId = locals.tenantId!;
		const itemId = parseInt(params.itemId);

		await db
			.delete(menuItems)
			.where(and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)));

		throw redirect(303, '/dashboard/menu/items');
	}
};
