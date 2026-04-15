import { json, error } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/schema';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const { request, locals } = event;

	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.tenantId) throw error(400, 'No tenant selected');

	try {
		const formData = await request.formData();
		const file = formData.get('logo');

		if (!(file instanceof File)) throw error(400, 'No file uploaded');

		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
		if (!allowedTypes.includes(file.type)) throw error(400, 'File must be JPG, PNG, WebP, or SVG');

		if (file.size > 2 * 1024 * 1024) throw error(400, 'File too large (max 2MB)');

		const timestamp = Date.now();
		const extension = file.name.split('.').pop() || 'png';
		const filename = `logo-${locals.tenantId}-${timestamp}.${extension}`;

		const uploadDir = join(process.cwd(), 'static', 'uploads', 'logos');
		await mkdir(uploadDir, { recursive: true });
		await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

		const logoUrl = `/uploads/logos/${filename}`;

		await db
			.update(tenant)
			.set({ logoUrl, updatedAt: new Date() })
			.where(eq(tenant.id, locals.tenantId));

		return json({ success: true, logoUrl });
	} catch (err) {
		if (err instanceof Response) throw err;
		console.error('Logo upload error:', err);
		throw error(500, 'Failed to upload logo');
	}
}
