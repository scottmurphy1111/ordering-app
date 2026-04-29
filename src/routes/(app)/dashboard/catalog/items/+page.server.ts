import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { eq, desc, like, and, sql, isNull } from 'drizzle-orm';
import { requireVendor } from '$lib/server/vendor';
import { fail } from '@sveltejs/kit';
import { catalogCategories, catalogItems } from '$lib/server/db/schema';
import { hasAddon, type AddonItem } from '$lib/billing';
import { vendor } from '$lib/server/db/vendor';
import { CatalogItemError, createCatalogItem } from '$lib/server/catalog/itemActions';

export const load: PageServerLoad = async (event) => {
	const vendorId = requireVendor(event);
	const { searchParams } = event.url;

	const search = searchParams.get('search')?.trim() || '';
	const rawCategoryId = searchParams.get('categoryId') || '';
	const filterUncategorised = rawCategoryId === 'uncategorised';
	const categoryId = rawCategoryId && !filterUncategorised ? parseInt(rawCategoryId) : null;
	const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
	const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
	const offset = (page - 1) * limit;

	const whereConditions = [eq(catalogItems.vendorId, vendorId)];
	if (search)
		whereConditions.push(like(sql`LOWER(${catalogItems.name})`, `%${search.toLowerCase()}%`));
	if (filterUncategorised) whereConditions.push(isNull(catalogItems.categoryId));
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
			createdAt: true
		},
		with: { category: { columns: { id: true, name: true } } },
		orderBy: [catalogItems.sortOrder, desc(catalogItems.createdAt)],
		limit,
		offset
	});

	const [totalCountResult, unfilteredCountResult] = await Promise.all([
		db.select({ count: sql<number>`count(*)` }).from(catalogItems).where(whereClause),
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
		vendorRecord?.subscriptionTier === 'pro' || (event.locals.user?.isInternal ?? false);
	const addons = (vendorRecord?.addons ?? []) as AddonItem[];

	return {
		items,
		categories,
		pagination: { page, limit, totalItems, totalPages },
		search,
		selectedCategoryId: filterUncategorised ? 'uncategorised' : categoryId,
		canImportCsv,
		totalItemsUnfiltered,
		hasSubscriptionsAddon: hasAddon(addons, 'subscriptions')
	};
};

export const actions: Actions = {
	setStatus: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const status = formData.get('status')?.toString() as 'draft' | 'available' | 'sold_out' | 'hidden' | undefined;
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
		await db.delete(catalogItems).where(and(eq(catalogItems.id, id), eq(catalogItems.vendorId, vendorId)));
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
	}
};
