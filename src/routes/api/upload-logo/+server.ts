import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { uploadToR2 } from '$lib/server/r2';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const { request, locals } = event;

	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.vendorId) throw error(400, 'No vendor selected');

	const formData = await request.formData();
	const file = formData.get('logo');

	if (!(file instanceof File)) throw error(400, 'No file uploaded');

	const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
	if (!allowedTypes.includes(file.type)) throw error(400, 'File must be JPG, PNG, WebP, or SVG');
	if (file.size > 2 * 1024 * 1024) throw error(400, 'File too large (max 2MB)');

	try {
		const logoUrl = await uploadToR2(file, `${locals.vendor!.slug}/logos/logo-${locals.vendorId}`);

		await db
			.update(vendor)
			.set({ logoUrl, updatedAt: new Date() })
			.where(eq(vendor.id, locals.vendorId));

		return json({ success: true, logoUrl });
	} catch (err) {
		console.error('Logo upload error:', err);
		throw error(500, 'Failed to upload logo');
	}
}
