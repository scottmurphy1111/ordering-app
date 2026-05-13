import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { specialOrderRequests } from '$lib/server/db/special-orders';
import { requireStaff } from '$lib/server/roles';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireStaff(locals);
	const vendorId = locals.vendorId!;

	const stateFilter = url.searchParams.get('state') ?? 'pending';

	const whereClause =
		stateFilter === 'all'
			? eq(specialOrderRequests.vendorId, vendorId)
			: and(
					eq(specialOrderRequests.vendorId, vendorId),
					eq(
						specialOrderRequests.state,
						stateFilter as 'pending' | 'quoted' | 'declined' | 'accepted' | 'expired'
					)
				);

	const requests = await db
		.select()
		.from(specialOrderRequests)
		.where(whereClause)
		.orderBy(desc(specialOrderRequests.createdAt))
		.limit(100);

	// Counts for filter pills
	const allCounts = await db
		.select()
		.from(specialOrderRequests)
		.where(eq(specialOrderRequests.vendorId, vendorId));

	const pendingCount = allCounts.filter((r) => r.state === 'pending').length;
	const declinedCount = allCounts.filter((r) => r.state === 'declined').length;

	return { requests, stateFilter, pendingCount, declinedCount, totalCount: allCounts.length };
};

export const actions: Actions = {
	decline: async ({ request, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;

		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const reason = formData.get('reason')?.toString().trim() || null;

		if (!id) return fail(400, { error: 'Missing request ID.' });

		const existing = await db.query.specialOrderRequests.findFirst({
			where: and(eq(specialOrderRequests.id, id), eq(specialOrderRequests.vendorId, vendorId)),
			columns: { id: true, state: true }
		});

		if (!existing) return fail(404, { error: 'Request not found.' });
		if (existing.state !== 'pending')
			return fail(400, { error: 'Only pending requests can be declined.' });

		await db
			.update(specialOrderRequests)
			.set({
				state: 'declined',
				declinedReason: reason,
				declinedAt: new Date(),
				updatedAt: new Date()
			})
			.where(and(eq(specialOrderRequests.id, id), eq(specialOrderRequests.vendorId, vendorId)));

		return { declineSuccess: true };
	}
};
