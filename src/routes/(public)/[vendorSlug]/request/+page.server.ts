import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, gte, and, count } from 'drizzle-orm';
import { specialOrderRequests } from '$lib/server/db/special-orders';
import { uploadToR2 } from '$lib/server/r2';

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE_MB = 10;
const RATE_LIMIT_PER_DAY = 50;

export const load: PageServerLoad = async ({ locals }) => {
	return { vendor: locals.vendor! };
};

export const actions: Actions = {
	submit: async ({ request, locals, params }) => {
		const vendor = locals.vendor;
		if (!vendor) return fail(400, { error: 'Vendor not found.' });

		const formData = await request.formData();

		const customerName = formData.get('customerName')?.toString().trim() ?? '';
		const customerEmail = formData.get('customerEmail')?.toString().trim() ?? '';
		const customerPhone = formData.get('customerPhone')?.toString().trim() || null;
		const description = formData.get('description')?.toString().trim() ?? '';
		const targetDate = formData.get('targetDate')?.toString().trim() || null;

		if (!customerName) return fail(400, { error: 'Name is required.' });
		if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
			return fail(400, { error: 'A valid email address is required.' });
		if (description.length < 10)
			return fail(400, { error: 'Please describe your order (at least 10 characters).' });
		if (description.length > 4000)
			return fail(400, { error: 'Description must be 4000 characters or fewer.' });

		// Rate limit: max 50 requests per day per vendor
		const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const [{ value: todayCount }] = await db
			.select({ value: count() })
			.from(specialOrderRequests)
			.where(
				and(
					eq(specialOrderRequests.vendorId, vendor.id),
					gte(specialOrderRequests.createdAt, dayAgo)
				)
			);
		if (todayCount >= RATE_LIMIT_PER_DAY)
			return fail(429, { error: 'Too many requests. Please try again tomorrow.' });

		// Upload photos
		const photoFiles = formData.getAll('photos') as File[];
		const validPhotos = photoFiles.filter((f) => f && f.size > 0);
		if (validPhotos.length > MAX_PHOTOS)
			return fail(400, { error: `You can upload up to ${MAX_PHOTOS} photos.` });

		const photoUrls: string[] = [];
		for (const photo of validPhotos) {
			if (photo.size > MAX_PHOTO_SIZE_MB * 1024 * 1024)
				return fail(400, { error: `Each photo must be ${MAX_PHOTO_SIZE_MB} MB or smaller.` });
			const url = await uploadToR2(photo, `special-orders/${vendor.slug}`);
			photoUrls.push(url);
		}

		await db.insert(specialOrderRequests).values({
			vendorId: vendor.id,
			customerName,
			customerEmail,
			customerPhone,
			description,
			targetDate,
			photoUrls,
			state: 'pending'
		});

		throw redirect(303, `/${params.vendorSlug}/request/sent`);
	}
};
