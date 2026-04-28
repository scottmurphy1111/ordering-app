import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { vendor, vendorUsers } from '$lib/server/db/vendor';
import { user as userTable } from '$lib/server/db/auth.schema';
import { ensureDevSeed, DEV_FAKE_USER, DEV_FAKE_SESSION } from '$lib/server/dev-bypass';

// ── Dev auth bypass ──────────────────────────────────────────────────────────
const BYPASS_AUTH = env.DEV_BYPASS_AUTH === 'true';

if (BYPASS_AUTH && env.NODE_ENV === 'production') {
	throw new Error(
		'[DEV AUTH BYPASS] DEV_BYPASS_AUTH cannot be enabled in production. Refusing to start.'
	);
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}
	return svelteKitHandler({ event, resolve, auth, building });
};

const handleVendorContext: Handle = async ({ event, resolve }) => {
	const { url, params, cookies } = event;

	// Ban check — direct DB query bypasses the 5-min session cookie cache
	const authExempt =
		url.pathname.startsWith('/banned') ||
		url.pathname.startsWith('/vendor-archived') ||
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

	// Public routes: vendor comes from URL param [tenantSlug]
	if (params.tenantSlug) {
		const currentVendor = await db.query.vendor.findFirst({
			where: eq(vendor.slug, params.tenantSlug)
		});
		if (currentVendor?.isActive) {
			event.locals.vendorId = currentVendor.id;
			event.locals.vendor = currentVendor;
		}
	}

	// Dashboard routes: vendor comes from selected-vendor cookie
	const isDashboard =
		url.pathname.startsWith('/dashboard') ||
		url.pathname.startsWith('/tenants') ||
		url.pathname.startsWith('/api/');
	if (isDashboard && !event.locals.vendorId) {
		const vendorIdCookie = cookies.get('selected-tenant-id');
		if (vendorIdCookie) {
			const vendorId = parseInt(vendorIdCookie);
			if (!isNaN(vendorId)) {
				const userId = event.locals.user?.id;
				const isInternal = event.locals.user?.isInternal ?? false;

				// Verify the user is actually a member of this vendor (internal users can access any)
				const membership =
					userId && !isInternal
						? await db.query.vendorUsers.findFirst({
								where: and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.userId, userId)),
								columns: { vendorId: true }
							})
						: { vendorId }; // internal users skip the membership check

				if (membership) {
					const currentVendor = await db.query.vendor.findFirst({
						where: eq(vendor.id, vendorId)
					});
					if (currentVendor?.isActive) {
						event.locals.vendorId = currentVendor.id;
						event.locals.vendor = currentVendor;

						// Resolve the user's role within this vendor
						if (userId && !isInternal) {
							const memberRecord = await db.query.vendorUsers.findFirst({
								where: and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.userId, userId)),
								columns: { role: true }
							});
							if (memberRecord) {
								event.locals.vendorRole =
									memberRecord.role as import('$lib/server/roles').VendorRole;
							}
						}
					} else if (currentVendor && !url.pathname.startsWith('/vendor-archived')) {
						throw redirect(303, '/vendor-archived');
					}
				}
			}
		}
	}

	return resolve(event);
};

export const handle: Handle = async ({ event, resolve }) => {
	if (BYPASS_AUTH) {
		console.warn(`[DEV AUTH BYPASS ACTIVE] ${event.request.method} ${event.url.pathname}`);
		const devVendor = await ensureDevSeed();
		event.locals.user = DEV_FAKE_USER;
		event.locals.session = DEV_FAKE_SESSION;
		event.locals.vendorId = devVendor.id;
		event.locals.vendor = devVendor;
		event.locals.vendorRole = 'owner';
		return resolve(event);
	}

	return handleBetterAuth({
		event,
		resolve: (event) => handleVendorContext({ event, resolve })
	});
};
