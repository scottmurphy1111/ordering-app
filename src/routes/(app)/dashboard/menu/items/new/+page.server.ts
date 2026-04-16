import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { menuItems, menuCategories } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;
	const categories = await db.query.menuCategories.findMany({
		where: eq(menuCategories.tenantId, tenantId),
		columns: { id: true, name: true },
		orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)]
	});
	return { categories };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim() || null;
		const priceStr = formData.get('price')?.toString();
		const discountedPriceStr = formData.get('discountedPrice')?.toString();
		const categoryIdStr = formData.get('categoryId')?.toString();
		const available = formData.get('available') === 'on';
		const tagsRaw = formData.get('tags')?.toString().trim();
		const imageUrl = formData.get('imageUrl')?.toString().trim() || null;

		if (!name) return fail(400, { error: 'Name is required' });
		if (!priceStr || isNaN(parseFloat(priceStr))) return fail(400, { error: 'Valid price is required' });

		const price = Math.round(parseFloat(priceStr) * 100);
		const discountedPrice = discountedPriceStr ? Math.round(parseFloat(discountedPriceStr) * 100) : null;
		const categoryId = categoryIdStr ? parseInt(categoryIdStr) : null;
		const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
		const images = imageUrl ? [{ url: imageUrl, isPrimary: true }] : [];
		const sortOrder = parseInt(formData.get('sortOrder')?.toString() ?? '0') || 0;

		const [item] = await db
			.insert(menuItems)
			.values({ tenantId, name, description, price, discountedPrice, categoryId, available, tags, images, sortOrder })
			.returning({ id: menuItems.id });

		throw redirect(303, `/dashboard/menu/items/${item.id}`);
	}
};
