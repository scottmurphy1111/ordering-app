import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, inArray } from 'drizzle-orm';
import { catalogItems } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params }) => {
	const vendorId = locals.vendorId!;
	const itemId = parseInt(params.itemId);

	if (isNaN(itemId)) throw error(404, 'Item not found');

	const item = await db.query.catalogItems.findFirst({
		where: and(
			eq(catalogItems.id, itemId),
			eq(catalogItems.vendorId, vendorId),
			inArray(catalogItems.status, ['available', 'sold_out'])
		),
		with: {
			modifiers: {
				with: {
					modifier: {
						with: { options: { orderBy: (o, { asc }) => [asc(o.id)] } }
					}
				}
			}
		}
	});

	if (!item) throw error(404, 'Item not found');

	// Transform normalized modifier relations into the shape the page expects
	const modifierGroups = item.modifiers
		.map((m) => m.modifier)
		.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
		.map((mod) => ({
			id: mod.id,
			name: mod.name,
			required: mod.isRequired ?? false,
			maxSelections: mod.maxSelections ?? 1,
			options: mod.options.map((opt) => ({
				name: opt.name,
				priceAdjustment: opt.priceAdjustment ?? 0,
				isDefault: opt.isDefault ?? false
			}))
		}));

	return { item, modifierGroups, vendorSlug: params.vendorSlug };
};
