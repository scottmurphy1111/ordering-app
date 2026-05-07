import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { systemEvents } from '$lib/server/db/system-events';
import { vendor } from '$lib/server/db/vendor';
import { desc, eq, like, count, and } from 'drizzle-orm';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
	const typeFilter = url.searchParams.get('type') ?? '';
	const statusFilter = url.searchParams.get('status') ?? ''; // 'ok' | 'error' | ''
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));

	const conditions = [];
	if (typeFilter) conditions.push(like(systemEvents.eventType, `${typeFilter}%`));
	if (statusFilter === 'ok' || statusFilter === 'error') {
		conditions.push(eq(systemEvents.status, statusFilter));
	}
	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: systemEvents.id,
				eventType: systemEvents.eventType,
				status: systemEvents.status,
				vendorId: systemEvents.vendorId,
				vendorName: vendor.name,
				metadata: systemEvents.metadata,
				createdAt: systemEvents.createdAt
			})
			.from(systemEvents)
			.leftJoin(vendor, eq(systemEvents.vendorId, vendor.id))
			.where(whereClause)
			.orderBy(desc(systemEvents.createdAt))
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE),
		db.select({ value: count() }).from(systemEvents).where(whereClause)
	]);

	return {
		events: rows,
		typeFilter,
		statusFilter,
		page,
		total: totalRows[0]?.value ?? 0,
		pageSize: PAGE_SIZE
	};
};
