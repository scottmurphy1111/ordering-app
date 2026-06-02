import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, and, ne, inArray, gt, asc } from 'drizzle-orm';
import { catalogItems, catalogCategories } from '$lib/server/db/schema';
import { vendorHours, vendorHoursExceptions } from '$lib/server/db/vendor-hours';
import { pickupWindows, pickupLocations } from '$lib/server/db/pickup';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const vendor = locals.vendor!;

	const fulfillmentModel = vendor.fulfillmentModel;
	const fetchHours = fulfillmentModel === 'storefront' || fulfillmentModel === 'hybrid';
	const fetchEvents = fulfillmentModel === 'pickup_only' || fulfillmentModel === 'hybrid';

	const now = new Date();

	const [categories, items, hours, exceptions, upcomingWindows] = await Promise.all([
		db.query.catalogCategories.findMany({
			where: and(eq(catalogCategories.vendorId, vendorId), ne(catalogCategories.isActive, false)),
			orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)]
		}),
		db.query.catalogItems.findMany({
			where: and(
				eq(catalogItems.vendorId, vendorId),
				inArray(catalogItems.status, ['available', 'sold_out']),
				ne(catalogItems.availabilityMode, 'unlisted')
			),
			orderBy: (i, { asc }) => [asc(i.sortOrder), asc(i.name)],
			columns: {
				id: true,
				name: true,
				description: true,
				price: true,
				discountedPrice: true,
				images: true,
				tags: true,
				categoryId: true,
				isSubscription: true,
				billingInterval: true,
				fulfillmentNote: true,
				status: true,
				pickupType: true,
				customDateLeadDays: true,
				availabilityMode: true
			},
			with: {
				modifiers: { columns: { modifierId: true } }
			}
		}),
		fetchHours
			? db.query.vendorHours.findMany({ where: eq(vendorHours.vendorId, vendorId) })
			: Promise.resolve([]),
		fetchHours
			? db.query.vendorHoursExceptions.findMany({
					where: eq(vendorHoursExceptions.vendorId, vendorId)
				})
			: Promise.resolve([]),
		fetchEvents
			? db
					.select({
						id: pickupWindows.id,
						startsAt: pickupWindows.startsAt,
						endsAt: pickupWindows.endsAt,
						name: pickupWindows.name,
						locationName: pickupLocations.name
					})
					.from(pickupWindows)
					.leftJoin(pickupLocations, eq(pickupWindows.locationId, pickupLocations.id))
					.where(
						and(
							eq(pickupWindows.vendorId, vendorId),
							eq(pickupWindows.isCancelled, false),
							gt(pickupWindows.startsAt, now)
						)
					)
					.orderBy(asc(pickupWindows.startsAt))
					.limit(8)
			: Promise.resolve([])
	]);

	// Group items by category
	const itemsByCategory = new Map<number | null, typeof items>();
	for (const item of items) {
		const key = item.categoryId ?? null;
		if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
		itemsByCategory.get(key)!.push(item);
	}

	return {
		categories,
		items,
		itemsByCategory: Object.fromEntries(itemsByCategory),
		vendorSlug: vendor.slug,
		hours,
		exceptions,
		upcomingWindows
	};
};
