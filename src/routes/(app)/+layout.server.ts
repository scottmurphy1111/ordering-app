import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenantUsers } from '$lib/server/db/schema';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Require authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	// Allow /tenants without a selected tenant (that's where you pick one)
	const isTenantRoute = url.pathname === '/tenants' || url.pathname.startsWith('/tenants/');
	if (!isTenantRoute && !locals.tenantId) {
		throw redirect(303, '/tenants');
	}

	const tenantCount = await db.$count(tenantUsers, eq(tenantUsers.userId, locals.user.id));

	return {
		user: locals.user,
		tenant: locals.tenant ?? null,
		tenantId: locals.tenantId ?? null,
		hasMultipleTenants: tenantCount > 1
	};
};
