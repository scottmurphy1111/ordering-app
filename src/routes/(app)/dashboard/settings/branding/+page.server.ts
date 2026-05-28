import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/schema';
import { FONT_PAIRS } from '$lib/storefront/font-pairs';
import { deleteFromR2 } from '$lib/server/r2';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const record = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: {
			logoUrl: true,
			heroImageUrl: true,
			backgroundColor: true,
			accentColor: true,
			foregroundColor: true,
			tagline: true,
			headerMode: true,
			heroDisplayMode: true,
			heroHeadline: true,
			fontPair: true
		}
	});

	return {
		branding: record ?? {
			logoUrl: null,
			heroImageUrl: null,
			backgroundColor: '#000000',
			accentColor: '#374151',
			foregroundColor: '#ffffff',
			tagline: null,
			headerMode: 'logo' as const,
			heroDisplayMode: 'headline_tagline' as const,
			heroHeadline: null,
			fontPair: 'fraunces-dm-sans'
		}
	};
};

export const actions: Actions = {
	saveColors: async ({ request, locals }) => {
		try {
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
		} catch (err) {
			console.error('[saveColors] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	},

	removeLogo: async ({ locals }) => {
		try {
			const vendorId = locals.vendorId!;
			await db
				.update(vendor)
				.set({ logoUrl: null, updatedAt: new Date() })
				.where(eq(vendor.id, vendorId));
			return { success: true, message: 'Logo removed' };
		} catch (err) {
			console.error('[removeLogo] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	},

	removeHeroImage: async ({ locals }) => {
		try {
			const vendorId = locals.vendorId!;
			await db
				.update(vendor)
				.set({ heroImageUrl: null, updatedAt: new Date() })
				.where(eq(vendor.id, vendorId));
			return { success: true, message: 'Hero image removed' };
		} catch (err) {
			console.error('[removeHeroImage] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	},

	saveIdentity: async ({ request, locals }) => {
		try {
			const vendorId = locals.vendorId!;
			const formData = await request.formData();

			const tagline = formData.get('tagline')?.toString().trim() ?? '';
			const headerModeRaw = formData.get('headerMode')?.toString();
			const heroDisplayModeRaw = formData.get('heroDisplayMode')?.toString();
			const heroHeadline = formData.get('heroHeadline')?.toString().trim() ?? '';

			if (tagline.length > 255) {
				return fail(400, { error: 'Tagline must be 255 characters or less.' });
			}

			if (headerModeRaw !== 'logo' && headerModeRaw !== 'name') {
				return fail(400, { error: 'Choose Logo or Business name for the header.' });
			}
			const headerMode = headerModeRaw;

			if (
				heroDisplayModeRaw !== 'none' &&
				heroDisplayModeRaw !== 'headline' &&
				heroDisplayModeRaw !== 'headline_tagline'
			) {
				return fail(400, { error: 'Choose what to show on the hero.' });
			}
			const heroDisplayMode = heroDisplayModeRaw;

			if (heroHeadline.length > 80) {
				return fail(400, { error: 'Headline must be 80 characters or less.' });
			}
			if (
				(heroDisplayMode === 'headline' || heroDisplayMode === 'headline_tagline') &&
				!heroHeadline
			) {
				return fail(400, { error: 'Add a headline before showing it on your storefront.' });
			}

			await db
				.update(vendor)
				.set({
					tagline: tagline || null,
					headerMode,
					heroDisplayMode,
					heroHeadline: heroHeadline || null,
					updatedAt: new Date()
				})
				.where(eq(vendor.id, vendorId));

			return { success: true, message: 'Identity saved' };
		} catch (err) {
			console.error('[saveIdentity] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	},

	acceptGeneratedHeroImage: async ({ request, locals }) => {
		try {
			const vendorId = locals.vendorId!;
			const formData = await request.formData();
			const url = formData.get('url')?.toString().trim();

			if (!url || !url.startsWith(env.R2_PUBLIC_URL ?? '')) {
				return fail(400, { error: 'Invalid image URL' });
			}

			const existing = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { heroImageUrl: true }
			});
			if (existing?.heroImageUrl) {
				try {
					await deleteFromR2(existing.heroImageUrl);
				} catch (err) {
					console.warn('[acceptGeneratedHeroImage] failed to delete old hero image:', err);
				}
			}

			await db
				.update(vendor)
				.set({ heroImageUrl: url, updatedAt: new Date() })
				.where(eq(vendor.id, vendorId));

			return { success: true, message: 'Hero image saved' };
		} catch (err) {
			console.error('[acceptGeneratedHeroImage] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	},

	saveFontPair: async ({ request, locals }) => {
		try {
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
		} catch (err) {
			console.error('[saveFontPair] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	}
};
