import type { PageServerLoad, Actions } from './$types';
import { fail, redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { menuItems, menuCategories, modifiers, modifierOptions, menuItemModifiers } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params }) => {
	const tenantId = locals.tenantId!;
	const itemId = parseInt(params.itemId);
	if (isNaN(itemId)) throw error(404, 'Not found');

	const [item, categories] = await Promise.all([
		db.query.menuItems.findFirst({
			where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
			with: {
				category: { columns: { id: true, name: true } },
				modifiers: {
					with: {
						modifier: {
							with: { options: { orderBy: (o, { asc }) => [asc(o.id)] } }
						}
					}
				}
			}
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
		const imageUrl = formData.get('imageUrl')?.toString().trim() || null;

		if (!name) return fail(400, { error: 'Name is required' });
		if (!priceStr || isNaN(parseFloat(priceStr))) return fail(400, { error: 'Valid price is required' });

		const price = Math.round(parseFloat(priceStr) * 100);
		const discountedPrice = discountedPriceStr ? Math.round(parseFloat(discountedPriceStr) * 100) : null;
		const categoryId = categoryIdStr ? parseInt(categoryIdStr) : null;
		const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
		const images = imageUrl ? [{ url: imageUrl, isPrimary: true }] : [];
		const sortOrder = parseInt(formData.get('sortOrder')?.toString() ?? '0') || 0;

		await db
			.update(menuItems)
			.set({ name, description, price, discountedPrice, categoryId, available, tags, images, sortOrder, updatedAt: new Date() })
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
	},

	addModifier: async ({ request, locals, params }) => {
		const tenantId = locals.tenantId!;
		const itemId = parseInt(params.itemId);
		const formData = await request.formData();

		const name = formData.get('modifierName')?.toString().trim();
		if (!name) return fail(400, { modifierError: 'Group name is required' });

		const isRequired = formData.get('isRequired') === 'on';
		const maxSelections = parseInt(formData.get('maxSelections')?.toString() ?? '1') || 1;

		const [mod] = await db
			.insert(modifiers)
			.values({ tenantId, name, isRequired, maxSelections })
			.returning({ id: modifiers.id });

		await db.insert(menuItemModifiers).values({ menuItemId: itemId, modifierId: mod.id });

		return { success: true };
	},

	updateModifier: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();

		const modifierId = parseInt(formData.get('modifierId')?.toString() ?? '');
		const name = formData.get('modifierName')?.toString().trim();
		if (!modifierId || !name) return fail(400, { modifierError: 'Invalid request' });

		const isRequired = formData.get('isRequired') === 'on';
		const maxSelections = parseInt(formData.get('maxSelections')?.toString() ?? '1') || 1;

		await db
			.update(modifiers)
			.set({ name, isRequired, maxSelections })
			.where(and(eq(modifiers.id, modifierId), eq(modifiers.tenantId, tenantId)));

		return { success: true };
	},

	deleteModifier: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();

		const modifierId = parseInt(formData.get('modifierId')?.toString() ?? '');
		if (!modifierId) return fail(400, { modifierError: 'Invalid request' });

		// Cascade deletes options + junction row
		await db
			.delete(modifiers)
			.where(and(eq(modifiers.id, modifierId), eq(modifiers.tenantId, tenantId)));

		return { success: true };
	},

	addOption: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();

		const modifierId = parseInt(formData.get('modifierId')?.toString() ?? '');
		const name = formData.get('optionName')?.toString().trim();
		if (!modifierId || !name) return fail(400, { modifierError: 'Invalid request' });

		// Verify modifier belongs to this tenant
		const mod = await db.query.modifiers.findFirst({
			where: and(eq(modifiers.id, modifierId), eq(modifiers.tenantId, tenantId)),
			columns: { id: true }
		});
		if (!mod) return fail(403, { modifierError: 'Not found' });

		const priceAdjStr = formData.get('priceAdjustment')?.toString() ?? '0';
		const priceAdjustment = Math.round(parseFloat(priceAdjStr || '0') * 100);
		const isDefault = formData.get('isDefault') === 'on';

		await db.insert(modifierOptions).values({ modifierId, name, priceAdjustment, isDefault });

		return { success: true };
	},

	deleteOption: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();

		const optionId = parseInt(formData.get('optionId')?.toString() ?? '');
		if (!optionId) return fail(400, { modifierError: 'Invalid request' });

		// Verify option belongs to a modifier owned by this tenant
		const option = await db.query.modifierOptions.findFirst({
			where: eq(modifierOptions.id, optionId),
			with: { modifier: { columns: { tenantId: true } } }
		});
		if (!option || option.modifier.tenantId !== tenantId) return fail(403, { modifierError: 'Not found' });

		await db.delete(modifierOptions).where(eq(modifierOptions.id, optionId));

		return { success: true };
	}
};
