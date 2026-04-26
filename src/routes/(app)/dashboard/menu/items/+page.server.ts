import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { eq, desc, like, and, sql, count } from 'drizzle-orm';
import { requireTenant } from '$lib/server/tenant';
import { fail } from '@sveltejs/kit';
import { menuCategories, menuItems } from '$lib/server/db/schema';
import { isAtItemLimit } from '$lib/billing';
import { tenant } from '$lib/server/db/tenant';

export const load: PageServerLoad = async (event) => {
	const tenantId = requireTenant(event);
	const { searchParams } = event.url;

	const search = searchParams.get('search')?.trim() || '';
	const categoryId = searchParams.get('categoryId')
		? parseInt(searchParams.get('categoryId')!)
		: null;
	const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
	const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
	const offset = (page - 1) * limit;

	const whereConditions = [eq(menuItems.tenantId, tenantId)];
	if (search)
		whereConditions.push(like(sql`LOWER(${menuItems.name})`, `%${search.toLowerCase()}%`));
	if (categoryId) whereConditions.push(eq(menuItems.categoryId, categoryId));
	const whereClause = and(...whereConditions);

	const items = await db.query.menuItems.findMany({
		where: whereClause,
		columns: {
			id: true,
			name: true,
			description: true,
			price: true,
			discountedPrice: true,
			images: true,
			available: true,
			sortOrder: true,
			createdAt: true
		},
		with: { category: { columns: { id: true, name: true } } },
		orderBy: [menuItems.sortOrder, desc(menuItems.createdAt)],
		limit,
		offset
	});

	const [totalCountResult, unfilteredCountResult] = await Promise.all([
		db.select({ count: sql<number>`count(*)` }).from(menuItems).where(whereClause),
		db
			.select({ count: sql<number>`count(*)` })
			.from(menuItems)
			.where(eq(menuItems.tenantId, tenantId))
	]);
	const totalItems = totalCountResult[0]?.count || 0;
	const totalItemsUnfiltered = Number(unfilteredCountResult[0]?.count ?? 0);
	const totalPages = Math.ceil(totalItems / limit);

	const categories = await db.query.menuCategories.findMany({
		where: eq(menuCategories.tenantId, tenantId),
		columns: { id: true, name: true },
		orderBy: menuCategories.sortOrder
	});

	const tenantRecord = await db.query.tenant.findFirst({
		where: eq(tenant.id, tenantId),
		columns: { subscriptionTier: true }
	});
	const canImportCsv =
		tenantRecord?.subscriptionTier === 'pro' || (event.locals.user?.isInternal ?? false);

	return {
		items,
		categories,
		pagination: { page, limit, totalItems, totalPages },
		search,
		selectedCategoryId: categoryId,
		canImportCsv,
		totalItemsUnfiltered
	};
};

export const actions: Actions = {
	toggleAvailable: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const available = formData.get('available') === 'true';
		if (isNaN(id)) return fail(400, { error: 'Invalid ID' });
		await db
			.update(menuItems)
			.set({ available, updatedAt: new Date() })
			.where(and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)));
		return { toggled: true };
	},

	delete: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid ID' });
		await db.delete(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)));
		return { deleted: true };
	},

	create: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;

		const [tenantRecord, countResult] = await Promise.all([
			db.query.tenant.findFirst({
				where: eq(tenant.id, tenantId),
				columns: { subscriptionTier: true }
			}),
			db.select({ count: count() }).from(menuItems).where(eq(menuItems.tenantId, tenantId))
		]);

		const tierKey = tenantRecord?.subscriptionTier ?? 'starter';
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
		const available = formData.get('available') === 'on';
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
			.insert(menuItems)
			.values({
				tenantId,
				name,
				description,
				price,
				discountedPrice,
				categoryId,
				available,
				tags,
				images,
				sortOrder
			})
			.returning({ id: menuItems.id, name: menuItems.name });

		return { success: true, item };
	}
};
