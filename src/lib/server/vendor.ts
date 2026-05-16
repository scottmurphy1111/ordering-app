import type { RequestEvent } from '@sveltejs/kit';

export function requireVendor(event: RequestEvent) {
	const vendorId = event.locals.vendorId;
	if (!vendorId) {
		throw new Error('Vendor not found or access denied');
	}
	return vendorId;
}
