import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendorUsers } from '$lib/server/db/schema';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Require authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	// Allow /tenants without a selected vendor (that's where you pick one)
	const isTenantRoute = url.pathname === '/tenants' || url.pathname.startsWith('/tenants/');
	if (!isTenantRoute && !locals.vendorId) {
		throw redirect(303, '/tenants');
	}

	const vendorCount = await db.$count(vendorUsers, eq(vendorUsers.userId, locals.user.id));

	return {
		user: locals.user,
		vendor: locals.vendor ?? null,
		vendorId: locals.vendorId ?? null,
		hasMultipleVendors: vendorCount > 1
	};
};
