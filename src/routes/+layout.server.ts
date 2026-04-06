// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getCurrentTenant } from '$lib/server/tenant';
import { redirect } from '@sveltejs/kit';
import type { User, Session } from 'better-auth'; // import types from better-auth

export const load: LayoutServerLoad = async (event) => {
	const { locals, url } = event;

	// Better Auth provides user and session via hooks.server.ts
	const user: User | null = locals.user ?? null;
	const session: Session | null = locals.session ?? null;

	// === Tenant Resolution ===
	let tenant = null;
	let tenantId: number | null = null;

	// Skip tenant resolution for auth pages, marketing homepage, and webhooks
	const skipTenantPaths = ['/login', '/signup', '/auth', '/api/webhooks/stripe'];
	const isSkipPath = skipTenantPaths.some((path) => url.pathname.startsWith(path));

	if (!isSkipPath) {
		tenant = await getCurrentTenant(event);

		if (tenant) {
			tenantId = tenant.id;
			locals.tenantId = tenantId; // attach for easy access in child loads
			locals.tenant = tenant;
		}
	}

	// === Admin Route Guard ===
	const isAdminRoute = url.pathname.startsWith('/dashboard');

	if (isAdminRoute) {
		if (!user) {
			// Not logged in → redirect to login with return URL
			const redirectTo = encodeURIComponent(url.pathname + url.search);
			throw redirect(303, `/login?redirectTo=${redirectTo}`);
		}

		if (!tenantId) {
			// Logged in but no valid tenant context
			// You can redirect to a tenant switcher or show an error
			throw redirect(303, '/dashboard/tenants'); // or wherever you list accessible tenants
		}

		// Future enhancement: Check tenant-specific role from tenant_users junction
		// e.g., const hasAccess = await checkTenantAccess(user.id, tenantId);
	}

	// === Data passed to all +page.svelte and child layouts ===
	return {
		user,
		session,
		tenant,
		tenantId
	};
};
