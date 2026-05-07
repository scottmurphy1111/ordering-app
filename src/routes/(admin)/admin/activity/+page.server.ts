import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, isNull, and, desc, gte, or, isNotNull, ilike, count } from 'drizzle-orm';
import { vendor } from '$lib/server/db/schema';

const PAGE_SIZE = 30;

type FilterKey = 'all' | 'paused' | 'cancel_scheduled' | 'past_due' | 'recent_signups';

export const load: PageServerLoad = async ({ url }) => {
	const filter = (url.searchParams.get('filter') ?? 'all') as FilterKey;
	const search = url.searchParams.get('search')?.trim() ?? '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1);

	const now = new Date();
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const conditions = [isNull(vendor.deletedAt)];

	if (filter === 'paused') {
		conditions.push(isNotNull(vendor.subscriptionPausedAt));
	} else if (filter === 'cancel_scheduled') {
		conditions.push(isNotNull(vendor.subscriptionEndsAt));
	} else if (filter === 'past_due') {
		conditions.push(eq(vendor.subscriptionStatus, 'past_due'));
	} else if (filter === 'recent_signups') {
		conditions.push(gte(vendor.createdAt, sevenDaysAgo));
	}

	if (search) {
		const pattern = `%${search}%`;
		conditions.push(or(ilike(vendor.name, pattern), ilike(vendor.slug, pattern))!);
	}

	const whereClause = and(...conditions);

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: vendor.id,
				name: vendor.name,
				slug: vendor.slug,
				subscriptionTier: vendor.subscriptionTier,
				subscriptionStatus: vendor.subscriptionStatus,
				subscriptionEndsAt: vendor.subscriptionEndsAt,
				subscriptionPausedAt: vendor.subscriptionPausedAt,
				pauseUntil: vendor.pauseUntil,
				createdAt: vendor.createdAt,
				updatedAt: vendor.updatedAt
			})
			.from(vendor)
			.where(whereClause)
			.orderBy(desc(vendor.updatedAt))
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE),
		db.select({ value: count() }).from(vendor).where(whereClause)
	]);

	return {
		vendors: rows,
		filter,
		search,
		page,
		total: totalRows[0]?.value ?? 0,
		pageSize: PAGE_SIZE
	};
};
