import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, asc } from 'drizzle-orm';
import { vendorHours, vendorHoursExceptions } from '$lib/server/db/vendor-hours';
import { isVendorOpen } from '$lib/hours/isOpen';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const vendor = locals.vendor!;
	const timezone = vendor.timezone;

	const [hours, exceptions] = await Promise.all([
		db.query.vendorHours.findMany({
			where: eq(vendorHours.vendorId, vendorId),
			orderBy: [asc(vendorHours.dayOfWeek), asc(vendorHours.openTime)]
		}),
		db.query.vendorHoursExceptions.findMany({
			where: eq(vendorHoursExceptions.vendorId, vendorId),
			orderBy: [asc(vendorHoursExceptions.date)]
		})
	]);

	const openState = isVendorOpen(hours, exceptions, timezone);

	const todayDayName = new Intl.DateTimeFormat('en', {
		timeZone: timezone,
		weekday: 'long'
	})
		.format(new Date())
		.toLowerCase();

	return {
		hours,
		exceptions,
		openState,
		timezone,
		todayDayName
	};
};
