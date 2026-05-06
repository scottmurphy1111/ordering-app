import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { eq, desc, like, and, sql, isNull } from 'drizzle-orm';
import { requireVendor } from '$lib/server/vendor';
import { fail, redirect } from '@sveltejs/kit';
import { catalogCategories, catalogItems } from '$lib/server/db/schema';
import { hasAddon, type AddonItem } from '$lib/billing';
import { vendor } from '$lib/server/db/vendor';
import {
	CatalogItemError,
	createCatalogItem,
	updateCatalogItem
} from '$lib/server/catalog/itemActions';
import {
	ModifierActionError,
	addModifierGroup,
	updateModifierGroup,
	deleteModifierGroup,
	addModifierOption,
	updateModifierOption,
	deleteModifierOption
} from '$lib/server/catalog/modifierActions';

export const load: PageServerLoad = async (event) => {
	const vendorId = requireVendor(event);
	const { searchParams } = event.url;

	const search = searchParams.get('search')?.trim() || '';
	const rawCategoryId = searchParams.get('categoryId') || '';
	const filterUncategorized = rawCategoryId === 'uncategorized';
	const categoryId = rawCategoryId && !filterUncategorized ? parseInt(rawCategoryId) : null;
	const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
	const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
	const offset = (page - 1) * limit;

	const whereConditions = [eq(catalogItems.vendorId, vendorId)];
	if (search)
		whereConditions.push(like(sql`LOWER(${catalogItems.name})`, `%${search.toLowerCase()}%`));
	if (filterUncategorized) whereConditions.push(isNull(catalogItems.categoryId));
	else if (categoryId) whereConditions.push(eq(catalogItems.categoryId, categoryId));
	const whereClause = and(...whereConditions);

	const items = await db.query.catalogItems.findMany({
		where: whereClause,
		columns: {
			id: true,
			name: true,
			description: true,
			price: true,
			discountedPrice: true,
			images: true,
			status: true,
			sortOrder: true,
			createdAt: true,
			tags: true,
			isSubscription: true,
			billingInterval: true
		},
		with: { category: { columns: { id: true, name: true } } },
		orderBy: [catalogItems.sortOrder, desc(catalogItems.createdAt)],
		limit,
		offset
	});

	const [totalCountResult, unfilteredCountResult] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)` })
			.from(catalogItems)
			.where(whereClause),
		db
			.select({ count: sql<number>`count(*)` })
			.from(catalogItems)
			.where(eq(catalogItems.vendorId, vendorId))
	]);
	const totalItems = totalCountResult[0]?.count || 0;
	const totalItemsUnfiltered = Number(unfilteredCountResult[0]?.count ?? 0);
	const totalPages = Math.ceil(totalItems / limit);

	const categories = await db.query.catalogCategories.findMany({
		where: eq(catalogCategories.vendorId, vendorId),
		columns: { id: true, name: true },
		orderBy: catalogCategories.sortOrder
	});

	const vendorRecord = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: { subscriptionTier: true, addons: true }
	});
	const canImportCsv =
		vendorRecord?.subscriptionTier === 'pro' ||
		vendorRecord?.subscriptionTier === 'market' ||
		(event.locals.user?.isInternal ?? false);
	const addons = (vendorRecord?.addons ?? []) as AddonItem[];

	// ── Drawer param ──────────────────────────────────────────────
	const drawerParam = searchParams.get('drawer');
	if (drawerParam && drawerParam !== 'new' && isNaN(parseInt(drawerParam))) {
		throw redirect(303, '/dashboard/catalog/items');
	}
	const drawerItemId = drawerParam && drawerParam !== 'new' ? parseInt(drawerParam) : null;
	const drawerItemResult = drawerItemId
		? await db.query.catalogItems.findFirst({
				where: and(eq(catalogItems.id, drawerItemId), eq(catalogItems.vendorId, vendorId)),
				columns: {
					id: true,
					name: true,
					description: true,
					price: true,
					discountedPrice: true,
					images: true,
					status: true,
					sortOrder: true,
					tags: true,
					isSubscription: true,
					billingInterval: true
				},
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
			})
		: undefined;
	if (drawerItemId && !drawerItemResult) {
		throw redirect(303, '/dashboard/catalog/items');
	}
	const drawer =
		drawerParam === 'new'
			? { mode: 'new' as const }
			: drawerItemResult
				? { mode: 'edit' as const, item: drawerItemResult }
				: null;

	return {
		items,
		categories,
		pagination: { page, limit, totalItems, totalPages },
		search,
		selectedCategoryId: filterUncategorized ? 'uncategorized' : categoryId,
		canImportCsv,
		totalItemsUnfiltered,
		hasSubscriptionsAddon: hasAddon(addons, 'subscriptions'),
		drawer
	};
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const itemId = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(itemId)) return fail(400, { error: 'Invalid item ID' });
		try {
			await updateCatalogItem(vendorId, itemId, formData);
			return { success: true };
		} catch (e) {
			if (e instanceof CatalogItemError) return fail(e.status, { error: e.message });
			throw e;
		}
	},

	setStatus: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const status = formData.get('status')?.toString() as
			| 'draft'
			| 'available'
			| 'sold_out'
			| 'hidden'
			| undefined;
		if (isNaN(id) || !status) return fail(400, { error: 'Invalid request' });
		await db
			.update(catalogItems)
			.set({ status, updatedAt: new Date() })
			.where(and(eq(catalogItems.id, id), eq(catalogItems.vendorId, vendorId)));
		return { updated: true };
	},

	delete: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid ID' });
		await db
			.delete(catalogItems)
			.where(and(eq(catalogItems.id, id), eq(catalogItems.vendorId, vendorId)));
		return { deleted: true };
	},

	create: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		try {
			const item = await createCatalogItem(vendorId, formData);
			return { success: true, item };
		} catch (e) {
			if (e instanceof CatalogItemError) return fail(e.status, { error: e.message });
			throw e;
		}
	},

	addModifier: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const itemId = parseInt(formData.get('itemId')?.toString() ?? '');
		if (isNaN(itemId)) return fail(400, { modifierError: 'Invalid item' });
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
