import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import { tenant, tenantUsers } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isInternal) throw redirect(303, '/tenants');

	const tenants = await db
		.select({
			id: tenant.id,
			name: tenant.name,
			slug: tenant.slug,
			type: tenant.type,
			isActive: tenant.isActive,
			subscriptionTier: tenant.subscriptionTier,
			subscriptionStatus: tenant.subscriptionStatus,
			createdAt: tenant.createdAt,
			deletedAt: tenant.deletedAt,
			ownerCount: sql<number>`count(${tenantUsers.userId}) filter (where ${tenantUsers.role} = 'owner')`
		})
		.from(tenant)
		.leftJoin(tenantUsers, eq(tenantUsers.tenantId, tenant.id))
		.groupBy(tenant.id)
		.orderBy(tenant.createdAt);

	return { tenants };
};

export const actions: Actions = {
	archive: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const id = Number((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await db.update(tenant).set({ isActive: false, updatedAt: new Date() }).where(eq(tenant.id, id));
	},

	restore: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const id = Number((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await db
			.update(tenant)
			.set({ isActive: true, deletedAt: null, updatedAt: new Date() })
			.where(eq(tenant.id, id));
	},

	delete: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const id = Number((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await db
			.update(tenant)
			.set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
			.where(eq(tenant.id, id));
	}
};
