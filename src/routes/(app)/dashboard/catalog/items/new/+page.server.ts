import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, count } from 'drizzle-orm';
import { catalogItems, catalogCategories } from '$lib/server/db/schema';
import { isAtItemLimit, hasAddon, type AddonItem } from '$lib/billing';
import { vendor } from '$lib/server/db/vendor';

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

		const [vendorRecord, countResult] = await Promise.all([
			db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { subscriptionTier: true }
			}),
			db.select({ count: count() }).from(catalogItems).where(eq(catalogItems.vendorId, vendorId))
		]);

		const tierKey = vendorRecord?.subscriptionTier ?? 'starter';
		const itemCount = countResult[0]?.count ?? 0;

		if (isAtItemLimit(tierKey, itemCount)) {
			return fail(403, {
				error: 'You have reached the item limit for your plan. Upgrade to add more items.'
			});
		}

		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim() || null;
		const priceStr = formData.get('price')?.toString();
		const discountedPriceStr = formData.get('discountedPrice')?.toString();
		const categoryIdStr = formData.get('categoryId')?.toString();
		const available = formData.get('available') === 'on';
		const tagsRaw = formData.get('tags')?.toString().trim();
		const imageUrl = formData.get('imageUrl')?.toString().trim() || null;

		if (!name) return fail(400, { error: 'Name is required' });
		if (!priceStr || isNaN(parseFloat(priceStr)))
			return fail(400, { error: 'Valid price is required' });

		const price = Math.round(parseFloat(priceStr) * 100);
		const discountedPrice = discountedPriceStr
			? Math.round(parseFloat(discountedPriceStr) * 100)
			: null;
		const categoryId = categoryIdStr ? parseInt(categoryIdStr) : null;
		const tags = tagsRaw
			? tagsRaw
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: [];
		const images = imageUrl ? [{ url: imageUrl, isPrimary: true }] : [];
		const sortOrder = parseInt(formData.get('sortOrder')?.toString() ?? '0') || 0;
		const isSubscription = formData.get('isSubscription') === 'on';
		const billingInterval = isSubscription
			? formData.get('billingInterval')?.toString() || 'monthly'
			: null;

		const [item] = await db
			.insert(catalogItems)
			.values({
				vendorId,
				name,
				description,
				price,
				discountedPrice,
				categoryId,
				available,
				tags,
				images,
				sortOrder,
				isSubscription,
				billingInterval
			})
			.returning({ id: catalogItems.id });

		throw redirect(303, `/dashboard/catalog/items/${item.id}`);
	}
};
