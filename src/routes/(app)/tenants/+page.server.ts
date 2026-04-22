import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant, tenantUsers } from '$lib/server/db/schema';

function canCreateTenant(isInternal: boolean, userTenants: Array<{ role: string; subscriptionTier: string | null }>) {
	if (isInternal) return true;
	if (userTenants.length === 0) return true;
	// Must own a Pro tenant to create additional tenants
	return userTenants.some((t) => t.role === 'owner' && t.subscriptionTier === 'pro');
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const userTenants = await db
		.select({
			id: tenant.id,
			name: tenant.name,
			slug: tenant.slug,
			type: tenant.type,
			isActive: tenant.isActive,
			logoUrl: tenant.logoUrl,
			subscriptionTier: tenant.subscriptionTier,
			role: tenantUsers.role,
			createdAt: tenant.createdAt
		})
		.from(tenantUsers)
		.innerJoin(tenant, eq(tenantUsers.tenantId, tenant.id))
		.where(eq(tenantUsers.userId, userId));

	userTenants.sort((a, b) => a.name.localeCompare(b.name));

	const isInternal = locals.user!.isInternal;
	const canCreate = canCreateTenant(isInternal, userTenants);
	return { tenants: userTenants, isInternal, canCreate };
};

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		const userId = locals.user!.id;
		const isInternal = locals.user!.isInternal;

		if (!isInternal) {
			const memberships = await db
				.select({ role: tenantUsers.role, subscriptionTier: tenant.subscriptionTier })
				.from(tenantUsers)
				.innerJoin(tenant, eq(tenantUsers.tenantId, tenant.id))
				.where(eq(tenantUsers.userId, userId));
			if (!canCreateTenant(false, memberships)) {
				return fail(403, { error: 'Upgrade to the Pro plan to create additional tenants.' });
			}
		}

		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const slug = formData.get('slug')?.toString().trim().toLowerCase().replace(/\s+/g, '-');
		const type = (formData.get('type')?.toString() as 'quick_service' | 'full_service' | 'cafe' | 'food_truck' | 'bar' | 'bakery' | 'other') ?? 'quick_service';

		if (!name) return fail(400, { error: 'Name is required' });
		if (!slug) return fail(400, { error: 'Slug is required' });
		if (!/^[a-z0-9-]+$/.test(slug)) return fail(400, { error: 'Slug may only contain lowercase letters, numbers, and hyphens' });

		// Check slug uniqueness
		const existing = await db.query.tenant.findFirst({ where: eq(tenant.slug, slug) });
		if (existing) return fail(400, { error: 'That slug is already taken' });

		// Create tenant + assign owner in one transaction
		const [newTenant] = await db
			.insert(tenant)
			.values({ name, slug, type, address: {} })
			.returning({ id: tenant.id });

		await db.insert(tenantUsers).values({
			tenantId: newTenant.id,
			userId,
			role: 'owner'
		});

		cookies.set('selected-tenant-id', String(newTenant.id), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		throw redirect(303, '/dashboard');
	},

	select: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const tenantId = formData.get('tenantId')?.toString();
		if (!tenantId) return fail(400, { error: 'No tenant selected' });

		const userId = locals.user!.id;
		const isInternal = locals.user!.isInternal;

		// Verify the user is a member of this tenant (internal users can select any)
		if (!isInternal) {
			const membership = await db.query.tenantUsers.findFirst({
				where: (tu) => eq(tu.tenantId, Number(tenantId)) && eq(tu.userId, userId),
				columns: { tenantId: true }
			});
			if (!membership) return fail(403, { error: 'You do not have access to that tenant' });
		}

		cookies.set('selected-tenant-id', tenantId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30
		});

		throw redirect(303, '/dashboard');
	}
};
