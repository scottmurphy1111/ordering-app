import { db } from '$lib/server/db';
import { eq, and, count } from 'drizzle-orm';
import { catalogItems } from '$lib/server/db/schema';
import { isAtItemLimit } from '$lib/billing';
import { vendor } from '$lib/server/db/vendor';

export class CatalogItemError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
		this.name = 'CatalogItemError';
	}
}

function parseItemFormData(formData: FormData) {
	const name = formData.get('name')?.toString().trim();
	const description = formData.get('description')?.toString().trim() || null;
	const priceStr = formData.get('price')?.toString();
	const discountedPriceStr = formData.get('discountedPrice')?.toString();
	const categoryIdStr = formData.get('categoryId')?.toString();
	const status = (formData.get('status')?.toString() || 'available') as
		| 'draft'
		| 'available'
		| 'sold_out'
		| 'hidden';
	const tagsRaw = formData.get('tags')?.toString().trim();
	const imageUrl = formData.get('imageUrl')?.toString().trim() || null;
	const sortOrder = parseInt(formData.get('sortOrder')?.toString() ?? '0') || 0;
	const isSubscription = formData.get('isSubscription') === 'on';
	const billingInterval = isSubscription
		? formData.get('billingInterval')?.toString() || 'monthly'
		: null;

	if (!name) throw new CatalogItemError(400, 'Name is required');
	if (!priceStr || isNaN(parseFloat(priceStr)))
		throw new CatalogItemError(400, 'Valid price is required');

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

	return {
		name,
		description,
		price,
		discountedPrice,
		categoryId,
		status,
		tags,
		images,
		sortOrder,
		isSubscription,
		billingInterval
	};
}

export async function createCatalogItem(
	vendorId: number,
	formData: FormData
): Promise<{ id: number; name: string }> {
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
		throw new CatalogItemError(
			403,
			'You have reached the item limit for your plan. Upgrade to add more items.'
		);
	}

	const fields = parseItemFormData(formData);

	const [item] = await db
		.insert(catalogItems)
		.values({ vendorId, ...fields })
		.returning({ id: catalogItems.id, name: catalogItems.name });

	return item;
}

export async function updateCatalogItem(
	vendorId: number,
	itemId: number,
	formData: FormData
): Promise<void> {
	const {
		name,
		description,
		price,
		discountedPrice,
		categoryId,
		status,
		tags,
		images,
		sortOrder,
		isSubscription,
		billingInterval
	} = parseItemFormData(formData);

	await db
		.update(catalogItems)
		.set({
			name,
			description,
			price,
			discountedPrice,
			categoryId,
			status,
			tags,
			images,
			sortOrder,
			isSubscription,
			billingInterval,
			updatedAt: new Date()
		})
		.where(and(eq(catalogItems.id, itemId), eq(catalogItems.vendorId, vendorId)));
}
