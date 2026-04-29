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
			settings: true
		}
	});

	return { info: record ?? null };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
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

		if (!name) return fail(400, { error: 'Business name is required.' });

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
				updatedAt: new Date()
			})
			.where(eq(vendor.id, vendorId));

		return { success: true };
	},

	saveHours: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
		const hours: Record<string, { open: string; close: string; closed?: boolean }> = {};
		for (const day of days) {
			const closed = formData.get(`${day}_closed`) === 'on';
			const open = formData.get(`${day}_open`)?.toString() ?? '09:00';
			const close = formData.get(`${day}_close`)?.toString() ?? '17:00';
			hours[day] = closed ? { open, close, closed: true } : { open, close };
		}

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { settings: true }
		});
		const current = (record?.settings ?? {}) as Record<string, unknown>;
		await db
			.update(vendor)
			.set({ settings: { ...current, hours }, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));

		return { hoursSuccess: true };
	},

	saveDelivery: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const enableDelivery = formData.get('enableDelivery') === 'on';
		const deliveryFeeRaw = parseFloat(formData.get('deliveryFee')?.toString() ?? '0');
		const deliveryFee = isNaN(deliveryFeeRaw) ? 0 : Math.round(deliveryFeeRaw * 100);

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { settings: true }
		});
		const current = (record?.settings ?? {}) as Record<string, unknown>;
		await db
			.update(vendor)
			.set({ settings: { ...current, enableDelivery, deliveryFee }, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));

		return { deliverySuccess: true };
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
