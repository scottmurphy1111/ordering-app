import { db } from '$lib/server/db';
import { and, eq, sql } from 'drizzle-orm';
import { catalogItems, pickupWindowTemplates, vendor } from '$lib/server/db/schema';

export type SetupStep = {
	id: 'stripe' | 'pickup' | 'catalog' | 'branding';
	label: string;
	description: string;
	href: string;
	complete: boolean;
};

export type SetupChecklistResult = {
	steps: SetupStep[];
	allComplete: boolean;
	completedCount: number;
};

export async function getSetupChecklist(vendorId: number): Promise<SetupChecklistResult> {
	// Read vendor fields fresh from DB — the locals.vendor object is cached
	// in dev-bypass mode and may be stale relative to write paths like
	// upload-logo. Always source completion truth from the DB, not from
	// a passed-in vendor object.
	const [vendorRow, pickupRow, catalogRow] = await Promise.all([
		db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { stripeSecretKey: true, logoUrl: true }
		}),
		db
			.select({ count: sql<number>`count(*)` })
			.from(pickupWindowTemplates)
			.where(
				and(eq(pickupWindowTemplates.vendorId, vendorId), eq(pickupWindowTemplates.isActive, true))
			),
		db
			.select({ count: sql<number>`count(*)` })
			.from(catalogItems)
			.where(and(eq(catalogItems.vendorId, vendorId), eq(catalogItems.status, 'available')))
	]);

	const steps: SetupStep[] = [
		{
			id: 'stripe',
			label: 'Connect Stripe',
			description: 'Required to accept payments from customers.',
			href: '/dashboard/settings/integrations',
			complete: vendorRow?.stripeSecretKey != null
		},
		{
			id: 'pickup',
			label: 'Set up pickup windows',
			description: 'Define when customers can pick up their orders.',
			href: '/dashboard/settings/pickup',
			complete: Number(pickupRow[0]?.count ?? 0) > 0
		},
		{
			id: 'catalog',
			label: 'Build your catalog',
			description: 'Add at least one item to your catalog.',
			href: '/dashboard/catalog/items',
			complete: Number(catalogRow[0]?.count ?? 0) > 0
		},
		{
			id: 'branding',
			label: 'Add branding',
			description: 'Upload a logo to personalize your storefront.',
			href: '/dashboard/settings/branding',
			complete: vendorRow?.logoUrl != null
		}
	];

	const completedCount = steps.filter((s) => s.complete).length;

	return {
		steps,
		allComplete: completedCount === 4,
		completedCount
	};
}
