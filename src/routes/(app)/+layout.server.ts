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

	// Allow /vendors without a selected vendor (that's where you pick one)
	const isVendorRoute = url.pathname === '/vendors' || url.pathname.startsWith('/vendors/');
	if (!isVendorRoute && !locals.vendorId) {
		throw redirect(303, '/vendors');
	}

	const vendorCount = await db.$count(vendorUsers, eq(vendorUsers.userId, locals.user.id));

	return {
		user: locals.user,
		vendor: locals.vendor ?? null,
		vendorId: locals.vendorId ?? null,
		hasMultipleVendors: vendorCount > 1
	};
};
