import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { vendorUsers } from '$lib/server/db/schema';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Require authentication. In production the login page lives on the apex host,
	// so redirect there directly to avoid an extra hop through the cross-host guard.
	if (!locals.user) {
		const loginBase = dev ? '' : (env.ORIGIN ?? 'https://getorderlocal.com');
		throw redirect(303, `${loginBase}/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	// Allow /vendors without a selected vendor (that's where you pick one)
	const isVendorRoute = url.pathname === '/vendors' || url.pathname.startsWith('/vendors/');
	if (!isVendorRoute && !locals.vendorId) {
		throw redirect(303, '/vendors');
	}

	const vendorCount = await db.$count(vendorUsers, eq(vendorUsers.userId, locals.user.id));

	// Impersonation = internal user inside a vendor they don't have a membership row for.
	// Cheap query: one membership lookup when isInternal AND a vendor is selected.
	let isImpersonating = false;
	if (locals.user.isInternal && locals.vendorId) {
		const membership = await db.query.vendorUsers.findFirst({
			where: and(eq(vendorUsers.userId, locals.user.id), eq(vendorUsers.vendorId, locals.vendorId)),
			columns: { vendorId: true }
		});
		isImpersonating = !membership;
	}

	return {
		user: locals.user,
		vendor: locals.vendor ?? null,
		vendorId: locals.vendorId ?? null,
		vendorRole: locals.vendorRole ?? null,
		hasMultipleVendors: vendorCount > 1,
		isImpersonating
	};
};
