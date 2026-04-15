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
			primaryColor: true,
			accentColor: true
		}
	});

	return {
		branding: record ?? {
			logoUrl: null,
			primaryColor: '#000000',
			accentColor: '#ffffff'
		}
	};
};

export const actions: Actions = {
	saveColors: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();

		const primaryColor = formData.get('primaryColor')?.toString().trim();
		const accentColor = formData.get('accentColor')?.toString().trim();

		const hexRegex = /^#[0-9a-fA-F]{6}$/;
		if (primaryColor && !hexRegex.test(primaryColor))
			return fail(400, { error: 'Invalid primary color format' });
		if (accentColor && !hexRegex.test(accentColor))
			return fail(400, { error: 'Invalid accent color format' });

		await db
			.update(tenant)
			.set({
				...(primaryColor ? { primaryColor } : {}),
				...(accentColor ? { accentColor } : {}),
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
	}
};
