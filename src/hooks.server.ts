import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/tenant';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

const handleTenantContext: Handle = async ({ event, resolve }) => {
	const slug = event.url.hostname.split('.')[0] || event.params.tenantSlug; // adjust for your routing
	if (slug) {
		const currentTenant = await db.query.tenant.findFirst({
			where: eq(tenant.slug, slug)
		});
		if (currentTenant) {
			event.locals.tenantId = currentTenant.id;
			event.locals.tenant = currentTenant;
		}
	}
	return resolve(event);
};

// Combine handlers (order matters: auth first, then tenant context)
export const handle: Handle = async ({ event, resolve }) => {
	return handleBetterAuth({
		event,
		resolve: (event) => handleTenantContext({ event, resolve })
	});
};
