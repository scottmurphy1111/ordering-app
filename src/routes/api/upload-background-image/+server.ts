import { json, error } from '@sveltejs/kit';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/schema';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const { request, locals } = event;

	// Verify user authentication
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Verify tenant context
	if (!locals.tenantId) {
		throw error(400, 'No tenant selected');
	}

	try {
		const formData = await request.formData();
		const file = formData.get('backgroundImage');

		// Validate file
		if (!(file instanceof File)) {
			throw error(400, 'No file uploaded');
		}

		// Validate file type (jpg preferred, but allow common image formats)
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			throw error(400, 'File must be a valid image format (JPG, PNG, or WebP)');
		}

		// Validate file size (max 5MB)
		const maxSize = 5 * 1024 * 1024; // 5MB
		if (file.size > maxSize) {
			throw error(400, 'File too large (max 5MB)');
		}

		// Generate unique filename
		const timestamp = Date.now();
		const extension = file.name.split('.').pop() || 'jpg';
		const filename = `background-${locals.tenantId}-${timestamp}.${extension}`;

		// Convert file to buffer
		const buffer = Buffer.from(await file.arrayBuffer());

		// Save file to static directory
		const uploadPath = join(process.cwd(), 'static', 'uploads', 'backgrounds');

		// Ensure directory exists (create if needed)
		await writeFile(join(uploadPath, '.keep'), '').catch(() => {
			// Directory might not exist, try to create the file anyway
		});

		const filePath = join(uploadPath, filename);
		await writeFile(filePath, buffer);

		// Update tenant with new background image URL
		const imageUrl = `/uploads/backgrounds/${filename}`;

		await db
			.update(tenant)
			.set({
				backgroundImageUrl: imageUrl,
				updatedAt: new Date()
			})
			.where(eq(tenant.id, locals.tenantId));

		return json({
			success: true,
			imageUrl
		});
	} catch (err) {
		console.error('Background image upload error:', err);

		if (err instanceof Response) {
			throw err;
		}

		throw error(500, 'Failed to upload background image');
	}
}

export async function DELETE(event: RequestEvent) {
	const { locals } = event;

	// Verify user authentication
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Verify tenant context
	if (!locals.tenantId) {
		throw error(400, 'No tenant selected');
	}

	try {
		// Remove background image URL from tenant
		await db
			.update(tenant)
			.set({
				backgroundImageUrl: null,
				updatedAt: new Date()
			})
			.where(eq(tenant.id, locals.tenantId));

		return json({
			success: true,
			message: 'Background image removed'
		});
	} catch (err) {
		console.error('Background image removal error:', err);
		throw error(500, 'Failed to remove background image');
	}
}
