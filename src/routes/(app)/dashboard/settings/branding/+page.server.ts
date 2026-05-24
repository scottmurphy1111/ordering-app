import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/schema';
import { FONT_PAIRS } from '$lib/storefront/font-pairs';
import { findPatternBySlug } from '$lib/storefront/background-patterns';
import { deleteFromR2 } from '$lib/server/r2';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const record = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: {
			logoUrl: true,
			bannerUrl: true,
			backgroundImageUrl: true,
			backgroundPatternSlug: true,
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
			backgroundPatternSlug: null,
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
			.set({ backgroundImageUrl: null, backgroundPatternSlug: null, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
		return { success: true, message: 'Background removed' };
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

	acceptGeneratedBanner: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const url = formData.get('url')?.toString().trim();

		if (!url || !url.startsWith(env.R2_PUBLIC_URL ?? '')) {
			return fail(400, { error: 'Invalid image URL' });
		}

		const existing = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { bannerUrl: true }
		});
		if (existing?.bannerUrl) {
			try {
				await deleteFromR2(existing.bannerUrl);
			} catch (err) {
				console.warn('[acceptGeneratedBanner] failed to delete old banner:', err);
			}
		}

		await db
			.update(vendor)
			.set({ bannerUrl: url, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));

		return { success: true, message: 'Banner saved' };
	},

	acceptGeneratedBackground: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const url = formData.get('url')?.toString().trim();

		if (!url || !url.startsWith(env.R2_PUBLIC_URL ?? '')) {
			return fail(400, { error: 'Invalid image URL' });
		}

		const existing = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { backgroundImageUrl: true }
		});
		if (existing?.backgroundImageUrl) {
			try {
				await deleteFromR2(existing.backgroundImageUrl);
			} catch (err) {
				console.warn('[acceptGeneratedBackground] failed to delete old background:', err);
			}
		}

		await db
			.update(vendor)
			.set({ backgroundImageUrl: url, backgroundPatternSlug: null, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));

		return { success: true, message: 'Background saved' };
	},

	selectPattern: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const slug = formData.get('slug')?.toString().trim();

		const pattern = findPatternBySlug(slug);
		if (!pattern) {
			return fail(400, { error: 'Unknown pattern' });
		}

		// Any non-null backgroundImageUrl is an R2-hosted asset — delete it
		// before switching to a pattern (patterns are purely slug-based, no URL).
		const existing = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { backgroundImageUrl: true }
		});
		if (existing?.backgroundImageUrl) {
			try {
				await deleteFromR2(existing.backgroundImageUrl);
			} catch (err) {
				console.warn('[selectPattern] failed to delete old background image:', err);
			}
		}

		await db
			.update(vendor)
			.set({
				backgroundImageUrl: null,
				backgroundPatternSlug: pattern.slug,
				updatedAt: new Date()
			})
			.where(eq(vendor.id, vendorId));

		return { success: true, message: 'Pattern applied' };
	},

	saveFontPair: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const fontPair = formData.get('fontPair')?.toString();
		if (!fontPair || !(fontPair in FONT_PAIRS)) {
			return fail(400, { error: 'Invalid font pair.' });
		}

		await db.update(vendor).set({ fontPair, updatedAt: new Date() }).where(eq(vendor.id, vendorId));

		return { success: true, message: 'Typography saved' };
	}
};
