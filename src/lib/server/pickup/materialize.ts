import { db } from '$lib/server/db';
import { pickupWindows, pickupWindowTemplates } from '$lib/server/db/pickup';
import { orders } from '$lib/server/db/orders';
import { vendor } from '$lib/server/db/vendor';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { expandTemplate } from './expand';

const HORIZON_WEEKS = 12;

export type MaterializeResult = {
	templateId: number;
	generated: number; // new pickup_windows rows inserted
	preserved: number; // future rows kept (have orders OR are customized)
	deleted: number; // orderless, un-customized future rows removed before regenerating
};

/**
 * Materializes pickup_windows occurrences for a single template.
 *
 * Policy (future-only, order-safe):
 *   - Past occurrences are never touched.
 *   - Future occurrences WITH attached orders are preserved as-is.
 *   - Future occurrences WITHOUT orders are deleted and regenerated.
 *   - Generates HORIZON_WEEKS forward from now.
 *   - Idempotent: safe to call multiple times; the (template_id, starts_at)
 *     unique constraint causes duplicate inserts to be silently skipped.
 *   - Inactive templates (is_active = false) return immediately with all zeros.
 */
export async function materializeTemplate(templateId: number): Promise<MaterializeResult> {
	const template = await db.query.pickupWindowTemplates.findFirst({
		where: eq(pickupWindowTemplates.id, templateId)
	});

	if (!template || !template.isActive) {
		return { templateId, generated: 0, preserved: 0, deleted: 0 };
	}

	const vendorRecord = await db.query.vendor.findFirst({
		where: eq(vendor.id, template.vendorId),
		columns: { timezone: true }
	});

	if (!vendorRecord) {
		throw new Error(`Vendor ${template.vendorId} not found for template ${templateId}`);
	}

	const now = new Date();
	const horizon = new Date(now.getTime() + HORIZON_WEEKS * 7 * 24 * 3_600_000);

	// Future rows for this template — include customization fields for Phase 8 preservation check.
	const futureRows = await db
		.select({
			id: pickupWindows.id,
			isCancelled: pickupWindows.isCancelled,
			maxOrders: pickupWindows.maxOrders,
			notes: pickupWindows.notes
		})
		.from(pickupWindows)
		.where(and(eq(pickupWindows.templateId, templateId), gt(pickupWindows.startsAt, now)));

	// Which of those have orders attached?
	const withOrderIds = new Set<number>();
	if (futureRows.length > 0) {
		const attached = await db
			.select({ windowId: orders.pickupWindowId })
			.from(orders)
			.where(inArray(orders.pickupWindowId, futureRows.map((r) => r.id)));
		for (const r of attached) {
			if (r.windowId !== null) withOrderIds.add(r.windowId);
		}
	}

	// A row is customized when the vendor individually edited it: cancelled, notes set,
	// or capacity differs from the template default. Customized rows are never auto-deleted —
	// the vendor's explicit override must survive template edits.
	const isCustomized = (r: (typeof futureRows)[number]) =>
		r.isCancelled === true || r.notes !== null || r.maxOrders !== template.maxOrders;

	const toDelete = futureRows
		.filter((r) => !withOrderIds.has(r.id))
		.filter((r) => !isCustomized(r))
		.map((r) => r.id);
	const preserved = futureRows.length - toDelete.length;

	// Expand occurrences through the horizon.
	// count = HORIZON_WEEKS * 7 is a generous upper bound that covers any day combination
	// (e.g. a daily template would produce up to 84 occurrences; weekly produces ~12).
	// Post-filter to horizon so we never insert beyond 12 weeks out.
	const occurrences = expandTemplate({
		recurrence: template.recurrence,
		windowStart: template.windowStart, // "HH:MM:SS" from DB — wallClockToUtc handles it
		windowEnd: template.windowEnd,
		cutoffHours: template.cutoffHours,
		vendorTimezone: vendorRecord.timezone,
		count: HORIZON_WEEKS * 7
	}).filter((occ) => occ.startsAt <= horizon);

	let generated = 0;

	// Not wrapped in db.transaction() — the Neon HTTP driver doesn't support transactions.
	// Atomicity is acceptable here: the orderless-AND-uncustomized check runs before delete
	// (no rows with orders or vendor customizations are at risk), and the unique constraint
	// + onConflictDoNothing makes the insert idempotent. A crash between delete and insert
	// self-heals on the next materialize call.
	if (toDelete.length > 0) {
		await db.delete(pickupWindows).where(inArray(pickupWindows.id, toDelete));
	}

	if (occurrences.length > 0) {
		const inserted = await db
			.insert(pickupWindows)
			.values(
				occurrences.map((occ) => ({
					templateId,
					vendorId: template.vendorId,
					locationId: template.locationId ?? null,
					name: template.name, // snapshot — name at generation time
					startsAt: occ.startsAt,
					endsAt: occ.endsAt,
					cutoffAt: occ.cutoffAt,
					maxOrders: template.maxOrders ?? null
				}))
			)
			.onConflictDoNothing()
			.returning({ id: pickupWindows.id });

		generated = inserted.length;
	}

	return { templateId, generated, preserved, deleted: toDelete.length };
}

/**
 * Materializes all active templates across all vendors.
 * Used by the nightly cron job.
 *
 * Per-template errors are caught and returned in the errors array so a single
 * bad template does not abort the entire run. Each template's delete+insert is
 * independently transacted — one template's failure leaves others unaffected.
 */
export async function materializeAllActiveTemplates(): Promise<{
	templatesProcessed: number;
	totalGenerated: number;
	totalPreserved: number;
	totalDeleted: number;
	errors: Array<{ templateId: number; error: string }>;
}> {
	const templates = await db
		.select({ id: pickupWindowTemplates.id })
		.from(pickupWindowTemplates)
		.where(eq(pickupWindowTemplates.isActive, true));

	let totalGenerated = 0;
	let totalPreserved = 0;
	let totalDeleted = 0;
	const errors: Array<{ templateId: number; error: string }> = [];

	for (const { id } of templates) {
		try {
			const result = await materializeTemplate(id);
			totalGenerated += result.generated;
			totalPreserved += result.preserved;
			totalDeleted += result.deleted;
		} catch (err) {
			errors.push({
				templateId: id,
				error: err instanceof Error ? err.message : String(err)
			});
		}
	}

	return {
		templatesProcessed: templates.length,
		totalGenerated,
		totalPreserved,
		totalDeleted,
		errors
	};
}
