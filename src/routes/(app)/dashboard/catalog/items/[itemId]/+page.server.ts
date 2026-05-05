import type { PageServerLoad, Actions } from './$types';
import { fail, redirect, error } from '@sveltejs/kit';
import { CatalogItemError, updateCatalogItem } from '$lib/server/catalog/itemActions';
import {
	ModifierActionError,
	addModifierGroup,
	updateModifierGroup,
	deleteModifierGroup,
	addModifierOption,
	updateModifierOption,
	deleteModifierOption
} from '$lib/server/catalog/modifierActions';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { catalogItems, catalogCategories } from '$lib/server/db/schema';
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
							with: { options: { orderBy: (o, { asc }) => [asc(o.sortOrder), asc(o.id)] } }
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
		try {
			await updateCatalogItem(vendorId, itemId, formData);
			return { success: true };
		} catch (e) {
			if (e instanceof CatalogItemError) return fail(e.status, { error: e.message });
			throw e;
		}
	},

	delete: async ({ locals, params }) => {
		const vendorId = locals.vendorId!;
		const itemId = parseInt(params.itemId);

		await db
			.delete(catalogItems)
			.where(and(eq(catalogItems.id, itemId), eq(catalogItems.vendorId, vendorId)));

		throw redirect(303, '/dashboard/catalog/items');
	},

	addModifier: async ({ request, locals, params }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const itemIdFromForm = parseInt(formData.get('itemId')?.toString() ?? '');
		const itemId = isNaN(itemIdFromForm) ? parseInt(params.itemId) : itemIdFromForm;
		const name = formData.get('modifierName')?.toString().trim();
		if (!name) return fail(400, { modifierError: 'Group name is required' });
		const isRequired = formData.get('isRequired') === 'on';
		const maxSelections = parseInt(formData.get('maxSelections')?.toString() ?? '1') || 1;
		try {
			await addModifierGroup(vendorId, itemId, name, isRequired, maxSelections);
			return { success: true };
		} catch (e) {
			if (e instanceof ModifierActionError) return fail(e.status, { modifierError: e.message });
			throw e;
		}
	},

	updateModifier: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		return updateModifierGroup(formData, vendorId);
	},

	deleteModifier: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const modifierId = parseInt(formData.get('modifierId')?.toString() ?? '');
		if (!modifierId) return fail(400, { modifierError: 'Invalid request' });
		try {
			await deleteModifierGroup(vendorId, modifierId);
			return { success: true };
		} catch (e) {
			if (e instanceof ModifierActionError) return fail(e.status, { modifierError: e.message });
			throw e;
		}
	},

	addOption: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const modifierId = parseInt(formData.get('modifierId')?.toString() ?? '');
		const name = formData.get('optionName')?.toString().trim();
		if (!modifierId || !name) return fail(400, { modifierError: 'Invalid request' });
		const priceAdjStr = formData.get('priceAdjustment')?.toString() ?? '0';
		const priceAdjustment = Math.round(parseFloat(priceAdjStr || '0') * 100);
		const isDefault = formData.get('isDefault') === 'on';
		try {
			await addModifierOption(vendorId, modifierId, name, priceAdjustment, isDefault);
			return { success: true };
		} catch (e) {
			if (e instanceof ModifierActionError) return fail(e.status, { modifierError: e.message });
			throw e;
		}
	},

	updateOption: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		return updateModifierOption(formData, vendorId);
	},

	deleteOption: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const optionId = parseInt(formData.get('optionId')?.toString() ?? '');
		if (!optionId) return fail(400, { modifierError: 'Invalid request' });
		try {
			await deleteModifierOption(vendorId, optionId);
			return { success: true };
		} catch (e) {
			if (e instanceof ModifierActionError) return fail(e.status, { modifierError: e.message });
			throw e;
		}
	}
};
