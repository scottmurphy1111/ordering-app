import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, count } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { catalogItems } from '$lib/server/db/catalog';
import { vendorHours } from '$lib/server/db/vendor-hours';
import { FULFILLMENT_MODELS } from '$lib/utils/fulfillment-model-labels';
import type { FulfillmentModelValue } from '$lib/utils/fulfillment-model-labels';

const VALID_MODELS = FULFILLMENT_MODELS.map((m) => m.value) as string[];

export const load: PageServerLoad = async ({ locals, url }) => {
	const vendorId = locals.vendorId!;

	const record = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: { fulfillmentModel: true }
	});

	const currentModel = record?.fulfillmentModel ?? 'hybrid';
	const targetParam = url.searchParams.get('to');
	const target =
		targetParam && VALID_MODELS.includes(targetParam) && targetParam !== currentModel
			? (targetParam as FulfillmentModelValue)
			: null;

	if (!target) {
		return { currentModel, target: null, orphans: null };
	}

	const [storefrontOnly, hoursRows] = await Promise.all([
		db
			.select({ count: count() })
			.from(catalogItems)
			.where(
				and(
					eq(catalogItems.vendorId, vendorId),
					eq(catalogItems.allowStoreHours, true),
					eq(catalogItems.allowPickupEvents, false),
					eq(catalogItems.allowCustomDate, false)
				)
			),
		db.select({ count: count() }).from(vendorHours).where(eq(vendorHours.vendorId, vendorId))
	]);

	return {
		currentModel,
		target,
		orphans: {
			storefrontItems: target === 'pickup_only' ? (storefrontOnly[0]?.count ?? 0) : 0,
			eventsItems: 0,
			hoursRows: target === 'pickup_only' ? (hoursRows[0]?.count ?? 0) : 0,
			windowTemplates: 0
		}
	};
};

export const actions: Actions = {
	commit: async ({ request, locals }) => {
		try {
			const vendorId = locals.vendorId!;
			const formData = await request.formData();
			const target = formData.get('target')?.toString() ?? '';

			if (!VALID_MODELS.includes(target)) {
				return fail(400, { error: 'Invalid fulfillment model.' });
			}

			const record = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { fulfillmentModel: true }
			});

			if (record?.fulfillmentModel === target) {
				return fail(400, { error: 'Already using that fulfillment model.' });
			}

			await db
				.update(vendor)
				.set({
					fulfillmentModel: target as typeof vendor.$inferSelect.fulfillmentModel,
					updatedAt: new Date()
				})
				.where(eq(vendor.id, vendorId));

			throw redirect(303, '/dashboard/settings/general?fulfillmentChanged=1');
		} catch (err) {
			// Re-throw SvelteKit redirects so the navigation completes normally.
			if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
				throw err;
			}
			console.error('[commit] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	}
};
