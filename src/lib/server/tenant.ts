import { db } from '$lib/server/db'; // your Drizzle instance
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { tenant } from './db/schema';

export async function getCurrentTenant(event: RequestEvent) {
	let slug: string | null = null;

	// 1. Try subdomain first (e.g. acme.yourapp.com)
	const host = event.url.hostname;
	if (host !== 'localhost' && !host.includes('yourapp.com')) {
		// adjust for your domain
		const parts = host.split('.');
		if (parts.length >= 3) {
			slug = parts[0]; // first part is the tenant slug
		}
	}

	// 2. Fallback to path-based (e.g. /acme-burger/menu) — useful for public routes
	if (!slug) {
		const pathParts = event.url.pathname.split('/').filter(Boolean);
		if (pathParts.length > 0) {
			slug = pathParts[0]; // first segment after root
		}
	}

	if (!slug) return null;

	// Lookup tenant (exclude inactive/suspended tenants)
	const currentTenant = await db.query.tenant.findFirst({
		where: eq(tenant.slug, slug),
		columns: {
			id: true,
			name: true,
			slug: true,
			logoUrl: true,
			bannerUrl: true,
			primaryColor: true,
			accentColor: true,
			settings: true,
			isActive: true
		}
	});

	return currentTenant && currentTenant.isActive ? currentTenant : null;
}

export function requireTenant(event: RequestEvent) {
	const tenantId = event.locals.tenantId;
	if (!tenantId) {
		throw new Error('Tenant not found or access denied');
	}
	return tenantId;
}
