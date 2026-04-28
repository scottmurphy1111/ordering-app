import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { vendor } from './db/schema';

export async function getCurrentVendor(event: RequestEvent) {
	let slug: string | null = null;

	const host = event.url.hostname;
	if (host !== 'localhost' && !host.includes('getorderlocal.com')) {
		const parts = host.split('.');
		if (parts.length >= 3) {
			slug = parts[0];
		}
	}

	if (!slug) {
		const pathParts = event.url.pathname.split('/').filter(Boolean);
		if (pathParts.length > 0) {
			slug = pathParts[0];
		}
	}

	if (!slug) return null;

	const currentVendor = await db.query.vendor.findFirst({
		where: eq(vendor.slug, slug),
		columns: {
			id: true,
			name: true,
			slug: true,
			logoUrl: true,
			bannerUrl: true,
			backgroundImageUrl: true,
			backgroundColor: true,
			accentColor: true,
			foregroundColor: true,
			settings: true,
			isActive: true
		}
	});

	return currentVendor && currentVendor.isActive ? currentVendor : null;
}

export function requireVendor(event: RequestEvent) {
	const vendorId = event.locals.vendorId;
	if (!vendorId) {
		throw new Error('Vendor not found or access denied');
	}
	return vendorId;
}
