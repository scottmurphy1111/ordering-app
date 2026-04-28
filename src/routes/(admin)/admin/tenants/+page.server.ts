import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import { vendor, vendorUsers } from '$lib/server/db/vendor';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isInternal) throw redirect(303, '/vendors');

	const vendors = await db
		.select({
			id: vendor.id,
			name: vendor.name,
			slug: vendor.slug,
			type: vendor.type,
			isActive: vendor.isActive,
			subscriptionTier: vendor.subscriptionTier,
			subscriptionStatus: vendor.subscriptionStatus,
			createdAt: vendor.createdAt,
			deletedAt: vendor.deletedAt,
			ownerCount: sql<number>`count(${vendorUsers.userId}) filter (where ${vendorUsers.role} = 'owner')`
		})
		.from(vendor)
		.leftJoin(vendorUsers, eq(vendorUsers.vendorId, vendor.id))
		.groupBy(vendor.id)
		.orderBy(vendor.createdAt);

	return { vendors };
};

export const actions: Actions = {
	archive: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const id = Number((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await db.update(vendor).set({ isActive: false, updatedAt: new Date() }).where(eq(vendor.id, id));
	},

	restore: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const id = Number((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await db
			.update(vendor)
			.set({ isActive: true, deletedAt: null, updatedAt: new Date() })
			.where(eq(vendor.id, id));
	},

	delete: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const id = Number((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await db
			.update(vendor)
			.set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
			.where(eq(vendor.id, id));
	}
};
