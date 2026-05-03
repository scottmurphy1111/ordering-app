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
	const file = formData.get('backgroundImage');

	if (!(file instanceof File)) throw error(400, 'No file uploaded');

	const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
	if (!allowedTypes.includes(file.type)) throw error(400, 'File must be JPG, PNG, or WebP');
	if (file.size > 5 * 1024 * 1024) throw error(400, 'File too large (max 5MB)');

	try {
		const imageUrl = await uploadToR2(
			file,
			`${locals.vendor!.slug}/backgrounds/background-${locals.vendorId}`
		);

		await db
			.update(vendor)
			.set({ backgroundImageUrl: imageUrl, updatedAt: new Date() })
			.where(eq(vendor.id, locals.vendorId));

		return json({ success: true, imageUrl });
	} catch (err) {
		console.error('Background image upload error:', err);
		throw error(500, 'Failed to upload background image');
	}
}

export async function DELETE(event: RequestEvent) {
	const { locals } = event;

	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.vendorId) throw error(400, 'No vendor selected');

	try {
		await db
			.update(vendor)
			.set({ backgroundImageUrl: null, updatedAt: new Date() })
			.where(eq(vendor.id, locals.vendorId));

		return json({ success: true });
	} catch (err) {
		console.error('Background image removal error:', err);
		throw error(500, 'Failed to remove background image');
	}
}
