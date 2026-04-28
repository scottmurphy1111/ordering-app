import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const record = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: {
			logoUrl: true,
			bannerUrl: true,
			backgroundImageUrl: true,
			backgroundColor: true,
			accentColor: true,
			foregroundColor: true
		}
	});

	return {
		branding: record ?? {
			logoUrl: null,
			bannerUrl: null,
			backgroundImageUrl: null,
			backgroundColor: '#000000',
			accentColor: '#374151',
			foregroundColor: '#ffffff'
		}
	};
};

export const actions: Actions = {
	saveColors: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const backgroundColor = formData.get('backgroundColor')?.toString().trim();
		const accentColor = formData.get('accentColor')?.toString().trim();
		const foregroundColor = formData.get('foregroundColor')?.toString().trim();

		const hexRegex = /^#[0-9a-fA-F]{6}$/;
		if (backgroundColor && !hexRegex.test(backgroundColor))
			return fail(400, { error: 'Invalid background color format' });
		if (accentColor && !hexRegex.test(accentColor))
			return fail(400, { error: 'Invalid accent color format' });
		if (foregroundColor && !hexRegex.test(foregroundColor))
			return fail(400, { error: 'Invalid foreground color format' });

		await db
			.update(vendor)
			.set({
				...(backgroundColor ? { backgroundColor } : {}),
				...(accentColor ? { accentColor } : {}),
				...(foregroundColor ? { foregroundColor } : {}),
				updatedAt: new Date()
			})
			.where(eq(vendor.id, vendorId));

		return { success: true, message: 'Colors saved' };
	},

	removeLogo: async ({ locals }) => {
		const vendorId = locals.vendorId!;
		await db.update(vendor).set({ logoUrl: null, updatedAt: new Date() }).where(eq(vendor.id, vendorId));
		return { success: true, message: 'Logo removed' };
	},

	removeBanner: async ({ locals }) => {
		const vendorId = locals.vendorId!;
		await db.update(vendor).set({ bannerUrl: null, updatedAt: new Date() }).where(eq(vendor.id, vendorId));
		return { success: true, message: 'Banner removed' };
	},

	removeBackground: async ({ locals }) => {
		const vendorId = locals.vendorId!;
		await db.update(vendor).set({ backgroundImageUrl: null, updatedAt: new Date() }).where(eq(vendor.id, vendorId));
		return { success: true, message: 'Background image removed' };
	}
};
