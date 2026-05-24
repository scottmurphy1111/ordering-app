import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, isNull } from 'drizzle-orm';
import { vendor, vendorUsers } from '$lib/server/db/schema';
import { seedVendorWithArchetype } from '$lib/server/seed/seed';
import { ARCHETYPES } from '$lib/server/seed/archetypes/index';
import { isReservedSubdomain } from '$lib/server/reserved-subdomains';

function canCreateVendor(isInternal: boolean, userVendors: Array<{ role: string }>) {
	if (isInternal) return true;
	if (userVendors.length === 0) return true;
	return userVendors.some((v) => v.role === 'owner');
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const isInternal = locals.user!.isInternal;

	let vendors: Array<{
		id: number;
		name: string;
		slug: string;
		type: string | null;
		isActive: boolean;
		logoUrl: string | null;
		subscriptionTier: string | null;
		role: string;
		createdAt: Date;
	}>;

	if (isInternal) {
		// Admin view: list every vendor (skip soft-deleted), with synthetic role 'admin'.
		// Owned vendors get their actual role overlaid below so the rendered label is
		// honest ("Owner" for vendors I own, "Admin" for the rest).
		const allVendors = await db
			.select({
				id: vendor.id,
				name: vendor.name,
				slug: vendor.slug,
				type: vendor.type,
				isActive: vendor.isActive,
				logoUrl: vendor.logoUrl,
				subscriptionTier: vendor.subscriptionTier,
				createdAt: vendor.createdAt
			})
			.from(vendor)
			.where(isNull(vendor.deletedAt));

		const memberships = await db
			.select({ vendorId: vendorUsers.vendorId, role: vendorUsers.role })
			.from(vendorUsers)
			.where(eq(vendorUsers.userId, userId));
		const roleByVendorId = new Map<number, string>(memberships.map((m) => [m.vendorId, m.role]));

		vendors = allVendors.map((v) => ({
			...v,
			role: roleByVendorId.get(v.id) ?? 'admin'
		}));
	} else {
		vendors = await db
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
	}

	vendors.sort((a, b) => a.name.localeCompare(b.name));

	const manageOverride = url.searchParams.get('manage') === 'true';

	if (!manageOverride && !isInternal && vendors.length === 1 && vendors[0].isActive === true) {
		throw redirect(303, '/dashboard');
	}

	const canCreate = canCreateVendor(isInternal, vendors);
	const archetypesList = Object.values(ARCHETYPES).map((a) => ({
		key: a.key,
		label: a.label,
		description: a.description,
		allowedFulfillmentModels: a.allowedFulfillmentModels
	}));
	return { vendors, isInternal, canCreate, archetypesList };
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
				return fail(403, { error: 'Only the vendor owner can create additional vendors.' });
			}
		}

		const formData = await request.formData();

		const archetypeKey = formData.get('archetypeKey')?.toString() || '';
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
		const fulfillmentModel = formData.get('fulfillmentModel')?.toString();

		if (!name) return fail(400, { error: 'Name is required' });
		if (!slug) return fail(400, { error: 'Slug is required' });
		if (!/^[a-z0-9-]+$/.test(slug))
			return fail(400, { error: 'Slug may only contain lowercase letters, numbers, and hyphens' });
		if (isReservedSubdomain(slug))
			return fail(400, { error: 'That slug is reserved. Please choose a different one.' });

		try {
			new Intl.DateTimeFormat('en-US', { timeZone: timezone });
		} catch {
			return fail(400, { error: 'Invalid timezone.' });
		}

		if (
			fulfillmentModel !== 'storefront' &&
			fulfillmentModel !== 'pickup_only' &&
			fulfillmentModel !== 'hybrid'
		) {
			return fail(400, { error: 'Please select a fulfillment model.' });
		}

		// Check slug uniqueness
		const existing = await db.query.vendor.findFirst({ where: eq(vendor.slug, slug) });
		if (existing) return fail(400, { error: 'That slug is already taken' });

		// Create vendor + assign owner in one transaction
		const [newVendor] = await db
			.insert(vendor)
			.values({
				name,
				slug,
				type,
				fulfillmentModel: fulfillmentModel as 'storefront' | 'pickup_only' | 'hybrid',
				address: {},
				timezone
			})
			.returning({ id: vendor.id });

		await db.insert(vendorUsers).values({
			vendorId: newVendor.id,
			userId,
			role: 'owner'
		});

		if (archetypeKey && ARCHETYPES[archetypeKey]) {
			await seedVendorWithArchetype(newVendor.id, archetypeKey);
		}

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
