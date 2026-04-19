import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { tenant, tenantUsers } from '$lib/server/db/tenant';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}
	return svelteKitHandler({ event, resolve, auth, building });
};

const handleTenantContext: Handle = async ({ event, resolve }) => {
	const { url, params, cookies } = event;

	// Public routes: tenant comes from URL param [tenantSlug]
	if (params.tenantSlug) {
		const currentTenant = await db.query.tenant.findFirst({
			where: eq(tenant.slug, params.tenantSlug)
		});
		if (currentTenant?.isActive) {
			event.locals.tenantId = currentTenant.id;
			event.locals.tenant = currentTenant;
		}
	}

	// Dashboard routes: tenant comes from selected-tenant cookie
	const isDashboard =
		url.pathname.startsWith('/dashboard') ||
		url.pathname.startsWith('/tenants') ||
		url.pathname.startsWith('/api/');
	if (isDashboard && !event.locals.tenantId) {
		const tenantIdCookie = cookies.get('selected-tenant-id');
		if (tenantIdCookie) {
			const tenantId = parseInt(tenantIdCookie);
			if (!isNaN(tenantId)) {
				const userId = event.locals.user?.id;
				const isInternal = event.locals.user?.isInternal ?? false;

				// Verify the user is actually a member of this tenant (internal users can access any)
				const membership = userId && !isInternal
					? await db.query.tenantUsers.findFirst({
							where: and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)),
							columns: { tenantId: true }
						})
					: { tenantId }; // internal users skip the membership check

				if (membership) {
					const currentTenant = await db.query.tenant.findFirst({
						where: eq(tenant.id, tenantId)
					});
					if (currentTenant?.isActive) {
						event.locals.tenantId = currentTenant.id;
						event.locals.tenant = currentTenant;

						// Resolve the user's role within this tenant
						if (userId && !isInternal) {
							const memberRecord = await db.query.tenantUsers.findFirst({
								where: and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)),
								columns: { role: true }
							});
							if (memberRecord) {
								event.locals.tenantRole = memberRecord.role as import('$lib/server/roles').TenantRole;
							}
						}
					}
				}
			}
		}
	}

	return resolve(event);
};

export const handle: Handle = async ({ event, resolve }) => {
	return handleBetterAuth({
		event,
		resolve: (event) => handleTenantContext({ event, resolve })
	});
};
