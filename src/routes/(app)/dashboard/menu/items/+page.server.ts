// src/routes/(app)/dashboard/menu/items/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

import { eq, desc, like, and, sql } from 'drizzle-orm';
import { requireTenant } from '$lib/server/tenant';
import { error } from '@sveltejs/kit';
import { menuCategories, menuItems } from '$lib/server/db/schema';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	const tenantId = requireTenant(event); // throws if no tenant

	// Optional: Check if user has access to this tenant (recommended)
	// You can expand this later with a tenant_users check

	const { searchParams } = event.url;

	// Query parameters
	const search = searchParams.get('search')?.trim() || '';
	const categoryId = searchParams.get('categoryId')
		? parseInt(searchParams.get('categoryId')!)
		: null;
	const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
	const limit = Math.min(50, parseInt(searchParams.get('limit') || '20')); // max 50 per page
	const offset = (page - 1) * limit;

	// Build where conditions with tenant isolation
	const whereConditions = [eq(menuItems.tenantId, tenantId)];

	if (search) {
		whereConditions.push(like(sql`LOWER(${menuItems.name})`, `%${search.toLowerCase()}%`));
	}

	if (categoryId) {
		whereConditions.push(eq(menuItems.categoryId, categoryId));
	}

	const whereClause = and(...whereConditions);

	// Fetch menu items with category info (for display)
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
		with: {
			category: {
				columns: {
					id: true,
					name: true
				}
			}
		},
		orderBy: [desc(menuItems.sortOrder), desc(menuItems.createdAt)],
		limit,
		offset
	});

	// Get total count for pagination
	const totalCountResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(menuItems)
		.where(whereClause);

	const totalItems = totalCountResult[0]?.count || 0;
	const totalPages = Math.ceil(totalItems / limit);

	// Get all categories for this tenant (for filter dropdown)
	const categories = await db.query.menuCategories.findMany({
		where: eq(menuCategories.tenantId, tenantId),
		columns: {
			id: true,
			name: true
		},
		orderBy: menuCategories.sortOrder
	});

	return {
		items,
		categories,
		pagination: {
			page,
			limit,
			totalItems,
			totalPages
		},
		search, // pass back for search input value
		selectedCategoryId: categoryId
	};
};
