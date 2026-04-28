import type { PageServerLoad, Actions } from './$types';
import { fail, redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import {
	catalogItems,
	catalogCategories,
	modifiers,
	modifierOptions,
	catalogItemModifiers
} from '$lib/server/db/schema';
import { hasAddon, type AddonItem } from '$lib/billing';
import { vendor } from '$lib/server/db/vendor';

export const load: PageServerLoad = async ({ locals, params }) => {
	const vendorId = locals.vendorId!;
	const itemId = parseInt(params.itemId);
	if (isNaN(itemId)) throw error(404, 'Not found');

	const [item, categories, vendorRecord] = await Promise.all([
		db.query.catalogItems.findFirst({
			where: and(eq(catalogItems.id, itemId), eq(catalogItems.vendorId, vendorId)),
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
		db.query.catalogCategories.findMany({
			where: eq(catalogCategories.vendorId, vendorId),
			columns: { id: true, name: true },
			orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)]
		}),
		db.query.vendor.findFirst({ where: eq(vendor.id, vendorId), columns: { addons: true } })
	]);

	if (!item) throw error(404, 'Item not found');
	const addons = (vendorRecord?.addons ?? []) as AddonItem[];
	return { item, categories, hasSubscriptionsAddon: hasAddon(addons, 'subscriptions') };
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const vendorId = locals.vendorId!;
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
		if (!priceStr || isNaN(parseFloat(priceStr)))
			return fail(400, { error: 'Valid price is required' });

		const price = Math.round(parseFloat(priceStr) * 100);
		const discountedPrice = discountedPriceStr
			? Math.round(parseFloat(discountedPriceStr) * 100)
			: null;
		const categoryId = categoryIdStr ? parseInt(categoryIdStr) : null;
		const tags = tagsRaw
			? tagsRaw
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: [];
		const images = imageUrl ? [{ url: imageUrl, isPrimary: true }] : [];
		const sortOrder = parseInt(formData.get('sortOrder')?.toString() ?? '0') || 0;
		const isSubscription = formData.get('isSubscription') === 'on';
		const billingInterval = isSubscription
			? formData.get('billingInterval')?.toString() || 'monthly'
			: null;

		await db
			.update(catalogItems)
			.set({
				name,
				description,
				price,
				discountedPrice,
				categoryId,
				available,
				tags,
				images,
				sortOrder,
				isSubscription,
				billingInterval,
				updatedAt: new Date()
			})
			.where(and(eq(catalogItems.id, itemId), eq(catalogItems.vendorId, vendorId)));

		return { success: true };
	},

	delete: async ({ locals, params }) => {
		const vendorId = locals.vendorId!;
		const itemId = parseInt(params.itemId);

		await db
			.delete(catalogItems)
			.where(and(eq(catalogItems.id, itemId), eq(catalogItems.vendorId, vendorId)));

		throw redirect(303, '/dashboard/menu/items');
	},

	addModifier: async ({ request, locals, params }) => {
		const vendorId = locals.vendorId!;
		const itemId = parseInt(params.itemId);
		const formData = await request.formData();

		const name = formData.get('modifierName')?.toString().trim();
		if (!name) return fail(400, { modifierError: 'Group name is required' });

		const isRequired = formData.get('isRequired') === 'on';
		const maxSelections = parseInt(formData.get('maxSelections')?.toString() ?? '1') || 1;

		const [mod] = await db
			.insert(modifiers)
			.values({ vendorId, name, isRequired, maxSelections })
			.returning({ id: modifiers.id });

		await db.insert(catalogItemModifiers).values({ catalogItemId: itemId, modifierId: mod.id });

		return { success: true };
	},

	updateModifier: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const modifierId = parseInt(formData.get('modifierId')?.toString() ?? '');
		const name = formData.get('modifierName')?.toString().trim();
		if (!modifierId || !name) return fail(400, { modifierError: 'Invalid request' });

		const isRequired = formData.get('isRequired') === 'on';
		const maxSelections = parseInt(formData.get('maxSelections')?.toString() ?? '1') || 1;

		await db
			.update(modifiers)
			.set({ name, isRequired, maxSelections })
			.where(and(eq(modifiers.id, modifierId), eq(modifiers.vendorId, vendorId)));

		return { success: true };
	},

	deleteModifier: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const modifierId = parseInt(formData.get('modifierId')?.toString() ?? '');
		if (!modifierId) return fail(400, { modifierError: 'Invalid request' });

		await db
			.delete(modifiers)
			.where(and(eq(modifiers.id, modifierId), eq(modifiers.vendorId, vendorId)));

		return { success: true };
	},

	addOption: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const modifierId = parseInt(formData.get('modifierId')?.toString() ?? '');
		const name = formData.get('optionName')?.toString().trim();
		if (!modifierId || !name) return fail(400, { modifierError: 'Invalid request' });

		const mod = await db.query.modifiers.findFirst({
			where: and(eq(modifiers.id, modifierId), eq(modifiers.vendorId, vendorId)),
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
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const optionId = parseInt(formData.get('optionId')?.toString() ?? '');
		if (!optionId) return fail(400, { modifierError: 'Invalid request' });

		const option = await db.query.modifierOptions.findFirst({
			where: eq(modifierOptions.id, optionId),
			with: { modifier: { columns: { vendorId: true } } }
		});
		if (!option || option.modifier.vendorId !== vendorId)
			return fail(403, { modifierError: 'Not found' });

		await db.delete(modifierOptions).where(eq(modifierOptions.id, optionId));

		return { success: true };
	}
};
