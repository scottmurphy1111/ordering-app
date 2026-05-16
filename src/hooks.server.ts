import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { vendor, vendorUsers } from '$lib/server/db/vendor';
import { user as userTable } from '$lib/server/db/auth.schema';
import { RESERVED_SUBDOMAINS } from '$lib/server/reserved-subdomains';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}
	return svelteKitHandler({ event, resolve, auth, building });
};

const handleVendorContext: Handle = async ({ event, resolve }) => {
	const { url, cookies } = event;

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

	// Host-based routing: determine whether this request targets the dashboard
	// or a customer storefront.
	//
	//   Dashboard hosts:  app.getorderlocal.com  (production)
	//                     localhost               (dev — ergonomic default for dashboard work)
	//                     app.localhost           (dev — explicit dashboard subdomain)
	//
	//   Storefront hosts: {slug}.getorderlocal.com  (production)
	//                     {slug}.localhost            (dev — Chrome resolves *.localhost natively)
	//
	//   Apex (getorderlocal.com / www.getorderlocal.com) is marketing — neither dashboard nor storefront.
	const hostname = url.hostname;
	const isDashboardHost =
		hostname === 'app.getorderlocal.com' || hostname === 'localhost' || hostname === '127.0.0.1';

	if (!isDashboardHost) {
		// Storefront host: vendor identity comes from the hostname's first label.
		let slug: string | null = null;

		const labels = hostname.split('.');
		const firstLabel = labels[0].toLowerCase();
		const isApex = hostname === 'getorderlocal.com' || hostname === 'www.getorderlocal.com';
		const isReserved = RESERVED_SUBDOMAINS.has(firstLabel);
		// Treat as a vendor subdomain only when the host has a genuine subdomain
		// (not the apex) and the first label is not reserved infrastructure.
		const hasSubdomain =
			(hostname.endsWith('.getorderlocal.com') && labels.length >= 3) ||
			(hostname.endsWith('.localhost') && labels.length >= 2 && firstLabel !== 'localhost');

		if (!isApex && !isReserved && hasSubdomain) {
			slug = firstLabel;
		}

		if (slug) {
			const currentVendor = await db.query.vendor.findFirst({
				where: eq(vendor.slug, slug)
			});
			if (currentVendor?.isActive) {
				event.locals.vendorId = currentVendor.id;
				event.locals.vendor = currentVendor;
			}
		}
	}

	// Dashboard host: vendor identity comes from the selected-vendor cookie.
	// On localhost/app.localhost a ?v={slug} query param also works as a dev
	// convenience for browsers that can't resolve *.localhost subdomains.
	if (isDashboardHost && !event.locals.vendorId) {
		// Dev-mode query-param fallback (?v=acme-bakery).
		if (hostname === 'localhost' || hostname === '127.0.0.1') {
			const querySlug = url.searchParams.get('v');
			if (querySlug && /^[a-z0-9-]+$/.test(querySlug)) {
				const currentVendor = await db.query.vendor.findFirst({
					where: eq(vendor.slug, querySlug)
				});
				if (currentVendor?.isActive) {
					event.locals.vendorId = currentVendor.id;
					event.locals.vendor = currentVendor;
				}
			}
		}

		// Cookie-based resolution (runs only if ?v= didn't resolve a vendor).
		if (!event.locals.vendorId) {
			const vendorIdCookie = cookies.get('selected-vendor-id');
			if (vendorIdCookie) {
				const vendorId = parseInt(vendorIdCookie);
				if (!isNaN(vendorId)) {
					const userId = event.locals.user?.id;
					const isInternal = event.locals.user?.isInternal ?? false;

					// Verify the user is actually a member of this vendor (internal users can access any).
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

							// Resolve the user's role within this vendor.
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
	}

	return resolve(event);
};

export const handle: Handle = async ({ event, resolve }) => {
	return handleBetterAuth({
		event,
		resolve: (event) => handleVendorContext({ event, resolve })
	});
};
