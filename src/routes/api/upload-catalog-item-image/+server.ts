import { json, error } from '@sveltejs/kit';
import { uploadToR2 } from '$lib/server/r2';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const { request, locals } = event;

	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.vendorId) throw error(400, 'No vendor selected');

	const formData = await request.formData();
	const file = formData.get('image');

	if (!(file instanceof File)) throw error(400, 'No file uploaded');

	const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
	if (!allowedTypes.includes(file.type)) throw error(400, 'File must be JPG, PNG, or WebP');
	if (file.size > 5 * 1024 * 1024) throw error(400, 'File too large (max 5MB)');

	try {
		const url = await uploadToR2(
			file,
			`${locals.vendor!.slug}/catalog-items/item-${locals.vendorId}`
		);
		return json({ url });
	} catch (err) {
		console.error('Catalog item image upload error:', err);
		throw error(500, 'Failed to upload image');
	}
}
