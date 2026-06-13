import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import { vendor, vendorUsers } from '$lib/server/db/vendor';
import { ARCHETYPES, archetypesForFulfillmentModel } from '$lib/server/seed/archetypes/index';
import type { FulfillmentModelValue } from '$lib/server/seed/types';
import { reseedVendor } from '$lib/server/seed/seed';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isInternal) throw redirect(303, '/vendors');

	const vendors = await db
		.select({
			id: vendor.id,
			name: vendor.name,
			slug: vendor.slug,
			type: vendor.type,
			fulfillmentModel: vendor.fulfillmentModel,
			isActive: vendor.isActive,
			subscriptionTier: vendor.subscriptionTier,
			subscriptionStatus: vendor.subscriptionStatus,
			createdAt: vendor.createdAt,
			deletedAt: vendor.deletedAt,
			ownerCount: sql<number>`count(${vendorUsers.userId}) filter (where ${vendorUsers.role} = 'owner')`
		})
		.from(vendor)
		.leftJoin(vendorUsers, eq(vendorUsers.vendorId, vendor.id))
		.groupBy(vendor.id)
		.orderBy(vendor.createdAt);

	const archetypesList = Object.values(ARCHETYPES).map((a) => ({
		key: a.key,
		label: a.label,
		allowedFulfillmentModels: a.allowedFulfillmentModels
	}));

	return { vendors, archetypesList };
};

export const actions: Actions = {
	archive: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const id = Number((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await db
			.update(vendor)
			.set({ isActive: false, updatedAt: new Date() })
			.where(eq(vendor.id, id));
	},

	restore: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const id = Number((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await db
			.update(vendor)
			.set({ isActive: true, deletedAt: null, updatedAt: new Date() })
			.where(eq(vendor.id, id));
	},

	delete: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const id = Number((await request.formData()).get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await db
			.update(vendor)
			.set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
			.where(eq(vendor.id, id));
	},

	reseed: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const data = await request.formData();
		const id = Number(data.get('id'));
		const archetypeKey = data.get('archetypeKey')?.toString();
		if (!id) return fail(400, { error: 'Missing id' });
		if (!archetypeKey || !ARCHETYPES[archetypeKey])
			return fail(400, { error: 'Invalid archetype' });

		const vendorRow = await db.query.vendor.findFirst({
			where: eq(vendor.id, id),
			columns: { id: true, fulfillmentModel: true }
		});
		if (!vendorRow) return fail(404, { error: 'Vendor not found' });

		const compatible = archetypesForFulfillmentModel(
			vendorRow.fulfillmentModel as FulfillmentModelValue
		);
		if (!compatible.some((a) => a.key === archetypeKey)) {
			return fail(400, {
				error: `Archetype "${archetypeKey}" is not compatible with this vendor's fulfillment model.`
			});
		}

		await reseedVendor(id, archetypeKey);
		return { reseedSuccess: true };
	}
};
