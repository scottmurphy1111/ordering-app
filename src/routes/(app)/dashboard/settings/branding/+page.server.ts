import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/schema';
import { FONT_PAIRS } from '$lib/storefront/font-pairs';

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
			foregroundColor: true,
			tagline: true,
			showName: true,
			showTagline: true,
			showLogo: true,
			fontPair: true
		}
	});

	return {
		branding: record ?? {
			logoUrl: null,
			bannerUrl: null,
			backgroundImageUrl: null,
			backgroundColor: '#000000',
			accentColor: '#374151',
			foregroundColor: '#ffffff',
			tagline: null,
			showName: true,
			showTagline: true,
			showLogo: true,
			fontPair: 'fraunces-dm-sans'
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
		await db
			.update(vendor)
			.set({ logoUrl: null, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		return { success: true, message: 'Logo removed' };
	},

	removeBanner: async ({ locals }) => {
		const vendorId = locals.vendorId!;
		await db
			.update(vendor)
			.set({ bannerUrl: null, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		return { success: true, message: 'Banner removed' };
	},

	removeBackground: async ({ locals }) => {
		const vendorId = locals.vendorId!;
		await db
			.update(vendor)
			.set({ backgroundImageUrl: null, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		return { success: true, message: 'Background image removed' };
	},

	saveIdentity: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const tagline = formData.get('tagline')?.toString().trim() ?? '';
		const showName = formData.get('showName') === 'on';
		const showTagline = formData.get('showTagline') === 'on';
		const showLogo = formData.get('showLogo') === 'on';

		if (tagline.length > 255) {
			return fail(400, { error: 'Tagline must be 255 characters or less.' });
		}

		await db
			.update(vendor)
			.set({
				tagline: tagline || null,
				showName,
				showTagline,
				showLogo,
				updatedAt: new Date()
			})
			.where(eq(vendor.id, vendorId));

		return { success: true, message: 'Identity saved' };
	},

	saveFontPair: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const fontPair = formData.get('fontPair')?.toString();
		if (!fontPair || !(fontPair in FONT_PAIRS)) {
			return fail(400, { error: 'Invalid font pair.' });
		}

		await db
			.update(vendor)
			.set({ fontPair, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));

		return { success: true, message: 'Typography saved' };
	}
};
