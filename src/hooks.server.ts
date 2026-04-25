import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { tenant, tenantUsers } from '$lib/server/db/tenant';
import { user as userTable } from '$lib/server/db/auth.schema';

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

	// Ban check — direct DB query bypasses the 5-min session cookie cache
	const authExempt =
		url.pathname.startsWith('/banned') ||
		url.pathname.startsWith('/tenant-archived') ||
		url.pathname.startsWith('/api/auth') ||
		url.pathname.startsWith('/login') ||
		url.pathname.startsWith('/verify');
	if (event.locals.user && !authExempt) {
		const fresh = await db.query.user.findFirst({
			where: eq(userTable.id, event.locals.user.id),
			columns: { bannedAt: true }
		});
		if (fresh?.bannedAt) throw redirect(303, '/banned');
	}

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
				const membership =
					userId && !isInternal
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
								event.locals.tenantRole =
									memberRecord.role as import('$lib/server/roles').TenantRole;
							}
						}
					} else if (currentTenant && !url.pathname.startsWith('/tenant-archived')) {
						// Tenant exists but has been archived or deleted
						throw redirect(303, '/tenant-archived');
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
