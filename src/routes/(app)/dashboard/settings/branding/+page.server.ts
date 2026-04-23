import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;
	const record = await db.query.tenant.findFirst({
		where: eq(tenant.id, tenantId),
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
		const tenantId = locals.tenantId!;
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
			.update(tenant)
			.set({
				...(backgroundColor ? { backgroundColor } : {}),
				...(accentColor ? { accentColor } : {}),
				...(foregroundColor ? { foregroundColor } : {}),
				updatedAt: new Date()
			})
			.where(eq(tenant.id, tenantId));

		return { success: true, message: 'Colors saved' };
	},

	removeLogo: async ({ locals }) => {
		const tenantId = locals.tenantId!;
		await db
			.update(tenant)
			.set({ logoUrl: null, updatedAt: new Date() })
			.where(eq(tenant.id, tenantId));
		return { success: true, message: 'Logo removed' };
	},

	removeBanner: async ({ locals }) => {
		const tenantId = locals.tenantId!;
		await db
			.update(tenant)
			.set({ bannerUrl: null, updatedAt: new Date() })
			.where(eq(tenant.id, tenantId));
		return { success: true, message: 'Banner removed' };
	},

	removeBackground: async ({ locals }) => {
		const tenantId = locals.tenantId!;
		await db
			.update(tenant)
			.set({ backgroundImageUrl: null, updatedAt: new Date() })
			.where(eq(tenant.id, tenantId));
		return { success: true, message: 'Background image removed' };
	}
};
