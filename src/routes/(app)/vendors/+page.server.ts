import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor, vendorUsers } from '$lib/server/db/schema';
import { seedDemoVendor } from '$lib/server/seed-demo';

function canCreateVendor(isInternal: boolean, userVendors: Array<{ role: string }>) {
	if (isInternal) return true;
	if (userVendors.length === 0) return true;
	return userVendors.some((v) => v.role === 'owner');
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;

	const userVendors = await db
		.select({
			id: vendor.id,
			name: vendor.name,
			slug: vendor.slug,
			type: vendor.type,
			isActive: vendor.isActive,
			logoUrl: vendor.logoUrl,
			subscriptionTier: vendor.subscriptionTier,
			role: vendorUsers.role,
			createdAt: vendor.createdAt
		})
		.from(vendorUsers)
		.innerJoin(vendor, eq(vendorUsers.vendorId, vendor.id))
		.where(eq(vendorUsers.userId, userId));

	userVendors.sort((a, b) => a.name.localeCompare(b.name));

	const manageOverride = url.searchParams.get('manage') === 'true';
	const isInternal = locals.user!.isInternal;

	if (
		!manageOverride &&
		!isInternal &&
		userVendors.length === 1 &&
		userVendors[0].isActive === true
	) {
		throw redirect(303, '/dashboard');
	}

	const canCreate = canCreateVendor(isInternal, userVendors);
	return { vendors: userVendors, isInternal, canCreate };
};

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		const userId = locals.user!.id;
		const isInternal = locals.user!.isInternal;

		if (!isInternal) {
			const memberships = await db
				.select({ role: vendorUsers.role })
				.from(vendorUsers)
				.where(eq(vendorUsers.userId, userId));
			if (!canCreateVendor(false, memberships)) {
				return fail(403, { error: 'Upgrade to the Pro plan to create additional vendors.' });
			}
		}

		const formData = await request.formData();

		const seedDemo = formData.get('seedDemo') === '1';
		const name = formData.get('name')?.toString().trim();
		const slug = formData.get('slug')?.toString().trim().toLowerCase().replace(/\s+/g, '-');
		const type =
			(formData.get('type')?.toString() as
				| 'bakery'
				| 'farm'
				| 'butcher'
				| 'florist'
				| 'brewery'
				| 'coffee_shop'
				| 'food_truck'
				| 'specialty_maker'
				| 'market_vendor'
				| 'other') ?? 'bakery';

		const timezone = formData.get('timezone')?.toString().trim() || 'America/New_York';

		if (!name) return fail(400, { error: 'Name is required' });
		if (!slug) return fail(400, { error: 'Slug is required' });
		if (!/^[a-z0-9-]+$/.test(slug))
			return fail(400, { error: 'Slug may only contain lowercase letters, numbers, and hyphens' });

		try {
			new Intl.DateTimeFormat('en-US', { timeZone: timezone });
		} catch {
			return fail(400, { error: 'Invalid timezone.' });
		}

		// Check slug uniqueness
		const existing = await db.query.vendor.findFirst({ where: eq(vendor.slug, slug) });
		if (existing) return fail(400, { error: 'That slug is already taken' });

		// Create vendor + assign owner in one transaction
		const [newVendor] = await db
			.insert(vendor)
			.values({ name, slug, type, address: {}, timezone })
			.returning({ id: vendor.id });

		await db.insert(vendorUsers).values({
			vendorId: newVendor.id,
			userId,
			role: 'owner'
		});

		if (seedDemo) await seedDemoVendor(newVendor.id);

		cookies.set('selected-vendor-id', String(newVendor.id), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30
		});

		throw redirect(303, '/dashboard');
	},

	select: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const vendorId = formData.get('vendorId')?.toString();
		if (!vendorId) return fail(400, { error: 'No vendor selected' });

		const userId = locals.user!.id;
		const isInternal = locals.user!.isInternal;

		// Verify the user is a member of this vendor (internal users can select any)
		if (!isInternal) {
			const membership = await db.query.vendorUsers.findFirst({
				where: (vu) => eq(vu.vendorId, Number(vendorId)) && eq(vu.userId, userId),
				columns: { vendorId: true }
			});
			if (!membership) return fail(403, { error: 'You do not have access to that vendor' });
		}

		cookies.set('selected-vendor-id', vendorId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30
		});

		throw redirect(303, '/dashboard');
	}
};
