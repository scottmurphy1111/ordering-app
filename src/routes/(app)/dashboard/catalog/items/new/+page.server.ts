import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { catalogCategories } from '$lib/server/db/schema';
import { hasAddon, type AddonItem } from '$lib/billing';
import { vendor } from '$lib/server/db/vendor';
import { CatalogItemError, createCatalogItem } from '$lib/server/catalog/itemActions';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const [categories, vendorRecord] = await Promise.all([
		db.query.catalogCategories.findMany({
			where: eq(catalogCategories.vendorId, vendorId),
			columns: { id: true, name: true },
			orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)]
		}),
		db.query.vendor.findFirst({ where: eq(vendor.id, vendorId), columns: { addons: true } })
	]);
	const addons = (vendorRecord?.addons ?? []) as AddonItem[];
	return { categories, hasSubscriptionsAddon: hasAddon(addons, 'subscriptions') };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		try {
			const item = await createCatalogItem(vendorId, formData);
			throw redirect(303, `/dashboard/catalog/items/${item.id}`);
		} catch (e) {
			if (e instanceof CatalogItemError) return fail(e.status, { error: e.message });
			throw e;
		}
	}
};
