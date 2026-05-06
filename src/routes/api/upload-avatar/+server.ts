import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { user } from '$lib/server/db/auth.schema';
import { uploadToR2 } from '$lib/server/r2';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const { request, locals } = event;

	if (!locals.user) throw error(401, 'Unauthorized');

	const formData = await request.formData();
	const file = formData.get('avatar');

	if (!(file instanceof File)) throw error(400, 'No file uploaded');

	const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
	if (!allowedTypes.includes(file.type)) throw error(400, 'File must be JPG, PNG, or WebP');
	if (file.size > 2 * 1024 * 1024) throw error(400, 'File too large (max 2MB)');

	try {
		const imageUrl = await uploadToR2(file, `users/${locals.user.id}/avatar`);

		await db
			.update(user)
			.set({ image: imageUrl, updatedAt: new Date() })
			.where(eq(user.id, locals.user.id));

		return json({ success: true, imageUrl });
	} catch (err) {
		console.error('Avatar upload error:', err);
		throw error(500, 'Failed to upload avatar');
	}
}
