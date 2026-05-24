import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, asc, and } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { vendorHours, vendorHoursExceptions } from '$lib/server/db/vendor-hours';
import { isVendorOpen } from '$lib/hours/isOpen';

const DAYS_OF_WEEK = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday'
] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const timezone = locals.vendor!.timezone;
	const fulfillmentModel = locals.vendor!.fulfillmentModel;

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

	return {
		timezone,
		fulfillmentModel,
		hours,
		exceptions,
		openState
	};
};

export const actions: Actions = {
	saveHours: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const rows: Array<{
			vendorId: number;
			dayOfWeek: (typeof DAYS_OF_WEEK)[number];
			openTime: string;
			closeTime: string;
		}> = [];

		for (const day of DAYS_OF_WEEK) {
			const enabled = formData.get(`${day}_enabled`) === 'on';
			if (!enabled) continue;

			const openRaw = formData.get(`${day}_open`)?.toString().trim();
			const closeRaw = formData.get(`${day}_close`)?.toString().trim();

			if (!openRaw || !closeRaw) continue;

			// Validate HH:MM format
			const timeRe = /^\d{2}:\d{2}$/;
			if (!timeRe.test(openRaw) || !timeRe.test(closeRaw)) {
				return fail(400, { error: `Invalid time format for ${day}.` });
			}

			rows.push({
				vendorId,
				dayOfWeek: day,
				openTime: openRaw + ':00',
				closeTime: closeRaw + ':00'
			});
		}

		// Wipe + replace (neon-http has no transactions; unique constraints protect against duplicates)
		await db.delete(vendorHours).where(eq(vendorHours.vendorId, vendorId));
		if (rows.length > 0) {
			await db.insert(vendorHours).values(rows);
		}

		return { saveSuccess: true };
	},

	addException: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const date = formData.get('date')?.toString().trim();
		if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			return fail(400, { addError: 'A valid date is required (YYYY-MM-DD).' });
		}

		const isClosed = formData.get('isClosed') === 'on';
		const openRaw = formData.get('openTime')?.toString().trim() || null;
		const closeRaw = formData.get('closeTime')?.toString().trim() || null;
		const note = formData.get('note')?.toString().trim() || null;

		if (!isClosed && (!openRaw || !closeRaw)) {
			return fail(400, {
				addError: 'Open and close times are required when not marking as closed.'
			});
		}

		const openTime = openRaw ? openRaw + ':00' : null;
		const closeTime = closeRaw ? closeRaw + ':00' : null;

		await db
			.insert(vendorHoursExceptions)
			.values({ vendorId, date, isClosed, openTime, closeTime, note })
			.onConflictDoUpdate({
				target: [vendorHoursExceptions.vendorId, vendorHoursExceptions.date],
				set: { isClosed, openTime, closeTime, note }
			});

		return { addSuccess: true };
	},

	removeException: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = Number(formData.get('exceptionId'));
		if (!id) return fail(400, { removeError: 'Missing exception ID.' });

		await db
			.delete(vendorHoursExceptions)
			.where(and(eq(vendorHoursExceptions.id, id), eq(vendorHoursExceptions.vendorId, vendorId)));

		return { removeSuccess: true };
	},

	// Re-fetch vendor timezone from vendor table (not locals — safer after timezone changes elsewhere)
	updateTimezone: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const timezone = formData.get('timezone')?.toString().trim() || 'America/New_York';

		try {
			new Intl.DateTimeFormat('en-US', { timeZone: timezone });
		} catch {
			return fail(400, { tzError: 'Invalid timezone.' });
		}

		await db.update(vendor).set({ timezone, updatedAt: new Date() }).where(eq(vendor.id, vendorId));
		return { tzSuccess: true };
	}
};
