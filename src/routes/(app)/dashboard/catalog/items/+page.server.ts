import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { eq, desc, like, and, sql, count, isNull } from 'drizzle-orm';
import { requireVendor } from '$lib/server/vendor';
import { fail } from '@sveltejs/kit';
import { catalogCategories, catalogItems } from '$lib/server/db/schema';
import { isAtItemLimit } from '$lib/billing';
import { vendor } from '$lib/server/db/vendor';

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
		columns: { subscriptionTier: true }
	});
	const canImportCsv =
		vendorRecord?.subscriptionTier === 'pro' || (event.locals.user?.isInternal ?? false);

	return {
		items,
		categories,
		pagination: { page, limit, totalItems, totalPages },
		search,
		selectedCategoryId: filterUncategorised ? 'uncategorised' : categoryId,
		canImportCsv,
		totalItemsUnfiltered
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

		const [vendorRecord, countResult] = await Promise.all([
			db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { subscriptionTier: true }
			}),
			db.select({ count: count() }).from(catalogItems).where(eq(catalogItems.vendorId, vendorId))
		]);

		const tierKey = vendorRecord?.subscriptionTier ?? 'starter';
		const itemCount = countResult[0]?.count ?? 0;

		if (isAtItemLimit(tierKey, itemCount)) {
			return fail(403, {
				error: 'You have reached the item limit for your plan. Upgrade to add more items.'
			});
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim() || null;
		const priceStr = formData.get('price')?.toString();
		const discountedPriceStr = formData.get('discountedPrice')?.toString();
		const categoryIdStr = formData.get('categoryId')?.toString();
		const tagsRaw = formData.get('tags')?.toString().trim();
		const imageUrl = formData.get('imageUrl')?.toString().trim() || null;
		const sortOrder = parseInt(formData.get('sortOrder')?.toString() ?? '0') || 0;

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

		const [item] = await db
			.insert(catalogItems)
			.values({
				vendorId,
				name,
				description,
				price,
				discountedPrice,
				categoryId,
				tags,
				images,
				sortOrder
			})
			.returning({ id: catalogItems.id, name: catalogItems.name });

		return { success: true, item };
	}
};
