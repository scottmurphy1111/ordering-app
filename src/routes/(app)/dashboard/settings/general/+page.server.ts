import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const record = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: {
			name: true,
			legalName: true,
			type: true,
			phone: true,
			email: true,
			website: true,
			address: true,
			timezone: true,
			settings: true
		}
	});

	return { info: record ?? null };
};

export const actions: Actions = {
	saveBusinessProfile: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const legalName = formData.get('legalName')?.toString().trim() || null;
		const type = formData.get('type')?.toString().trim() || null;
		const phone = formData.get('phone')?.toString().trim() || null;
		const email = formData.get('email')?.toString().trim() || null;
		const rawWebsite = formData.get('website')?.toString().trim() || null;
		const website = rawWebsite
			? rawWebsite.startsWith('http://') || rawWebsite.startsWith('https://')
				? rawWebsite
				: `https://${rawWebsite}`
			: null;

		const street = formData.get('street')?.toString().trim() || null;
		const city = formData.get('city')?.toString().trim() || null;
		const state = formData.get('state')?.toString().trim() || null;
		const zip = formData.get('zip')?.toString().trim() || null;
		const country = formData.get('country')?.toString().trim() || null;
		const timezone = formData.get('timezone')?.toString().trim() || 'America/New_York';

		if (!name) return fail(400, { error: 'Business name is required.' });

		try {
			new Intl.DateTimeFormat('en-US', { timeZone: timezone });
		} catch {
			return fail(400, { error: 'Invalid timezone.' });
		}

		const address = { street, city, state, zip, country };

		await db
			.update(vendor)
			.set({
				name,
				legalName,
				type: type as typeof vendor.$inferSelect.type,
				phone,
				email,
				website,
				address,
				timezone,
				updatedAt: new Date()
			})
			.where(eq(vendor.id, vendorId));

		return { success: true };
	},

	saveCheckout: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const enableTips = formData.get('enableTips') === 'on';
		const asapPickupEnabled = formData.get('asapPickupEnabled') === 'on';

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { settings: true }
		});
		const current = (record?.settings ?? {}) as Record<string, unknown>;
		await db
			.update(vendor)
			.set({ settings: { ...current, enableTips, asapPickupEnabled }, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));

		return { checkoutSuccess: true };
	}
};
