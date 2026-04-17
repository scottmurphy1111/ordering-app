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
			name: true,
			legalName: true,
			type: true,
			phone: true,
			email: true,
			website: true,
			address: true
		}
	});

	return { info: record ?? null };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const legalName = formData.get('legalName')?.toString().trim() || null;
		const type = formData.get('type')?.toString().trim() || null;
		const phone = formData.get('phone')?.toString().trim() || null;
		const email = formData.get('email')?.toString().trim() || null;
		const website = formData.get('website')?.toString().trim() || null;

		const street = formData.get('street')?.toString().trim() || null;
		const city = formData.get('city')?.toString().trim() || null;
		const state = formData.get('state')?.toString().trim() || null;
		const zip = formData.get('zip')?.toString().trim() || null;
		const country = formData.get('country')?.toString().trim() || null;

		if (!name) return fail(400, { error: 'Business name is required.' });

		const address = { street, city, state, zip, country };

		await db
			.update(tenant)
			.set({ name, legalName, type: type as typeof tenant.$inferSelect.type, phone, email, website, address, updatedAt: new Date() })
			.where(eq(tenant.id, tenantId));

		return { success: true };
	}
};
