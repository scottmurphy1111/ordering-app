import type { PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vendorHours, vendorHoursExceptions } from '$lib/server/db/vendor-hours';
import { getAvailableWindows } from '$lib/server/pickup/checkout';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const vendor = locals.vendor!;

	const fetchHours =
		vendor.fulfillmentModel === 'storefront' || vendor.fulfillmentModel === 'hybrid';

	const [availableWindows, hours, exceptions] = await Promise.all([
		getAvailableWindows(vendorId),
		fetchHours
			? db.query.vendorHours.findMany({ where: eq(vendorHours.vendorId, vendorId) })
			: Promise.resolve([]),
		fetchHours
			? db.query.vendorHoursExceptions.findMany({
					where: eq(vendorHoursExceptions.vendorId, vendorId)
				})
			: Promise.resolve([])
	]);

	return {
		vendorSlug: vendor.slug,
		availableWindows,
		hours,
		exceptions
	};
};
