import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, asc, gt, inArray, isNull, ne, sql } from 'drizzle-orm';
import { pickupLocations, pickupWindowTemplates, pickupWindows } from '$lib/server/db/pickup';
import { vendor } from '$lib/server/db/vendor';
import { orders } from '$lib/server/db/orders';
import { materializeTemplate } from '$lib/server/pickup/materialize';
import { startOfDayInTZ } from '$lib/server/pickup/expand';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const timezone = locals.vendor!.timezone;

	const now = new Date();

	const [locations, templates, upcomingWindows] = await Promise.all([
		db.query.pickupLocations.findMany({
			where: eq(pickupLocations.vendorId, vendorId),
			orderBy: [asc(pickupLocations.sortOrder), asc(pickupLocations.name)]
		}),
		db.query.pickupWindowTemplates.findMany({
			where: eq(pickupWindowTemplates.vendorId, vendorId),
			orderBy: [asc(pickupWindowTemplates.name)]
		}),
		db
			.select({
				id: pickupWindows.id,
				templateId: pickupWindows.templateId,
				startsAt: pickupWindows.startsAt,
				endsAt: pickupWindows.endsAt,
				cutoffAt: pickupWindows.cutoffAt,
				isCancelled: pickupWindows.isCancelled,
				maxOrders: pickupWindows.maxOrders,
				notes: pickupWindows.notes
			})
			.from(pickupWindows)
			.where(
				and(
					eq(pickupWindows.vendorId, vendorId),
					gt(pickupWindows.startsAt, now)
					// Phase 8: include cancelled occurrences so vendors can see and restore them
				)
			)
			.orderBy(asc(pickupWindows.startsAt))
	]);

	const upcomingByTemplate: Record<number, typeof upcomingWindows> = {};
	for (const w of upcomingWindows) {
		if (w.templateId === null) continue;
		if (!upcomingByTemplate[w.templateId]) upcomingByTemplate[w.templateId] = [];
		if (upcomingByTemplate[w.templateId].length < 6) {
			upcomingByTemplate[w.templateId].push(w);
		}
	}

	// Per-template "can delete" check: deletable only when no future non-cancelled orders
	// reference any of its occurrences. Drives the UI's Delete button enabled/disabled state.
	const templateIds = templates.map((t) => t.id);
	const futureCommitments: Record<number, number> = {};
	if (templateIds.length > 0) {
		const futureWindowsForTemplates = await db
			.select({ id: pickupWindows.id, templateId: pickupWindows.templateId })
			.from(pickupWindows)
			.where(and(inArray(pickupWindows.templateId, templateIds), gt(pickupWindows.endsAt, now)));

		const windowToTemplate = new Map<number, number>();
		for (const w of futureWindowsForTemplates) {
			if (w.templateId !== null) windowToTemplate.set(w.id, w.templateId);
		}

		if (windowToTemplate.size > 0) {
			const windowIds = Array.from(windowToTemplate.keys());
			const orderRows = await db
				.select({ pickupWindowId: orders.pickupWindowId })
				.from(orders)
				.where(and(inArray(orders.pickupWindowId, windowIds), ne(orders.status, 'cancelled')));

			for (const o of orderRows) {
				if (o.pickupWindowId === null) continue;
				const tmplId = windowToTemplate.get(o.pickupWindowId);
				if (tmplId === undefined) continue;
				futureCommitments[tmplId] = (futureCommitments[tmplId] ?? 0) + 1;
			}
		}
	}

	const templatesWithMeta = templates.map((t) => ({
		...t,
		canDelete: (futureCommitments[t.id] ?? 0) === 0,
		futureCommitmentCount: futureCommitments[t.id] ?? 0
	}));

	return { locations, templates: templatesWithMeta, timezone, upcomingByTemplate };
};

// ─── Location helpers (Phase 2) ──────────────────────────────────────────────

type AddressInput = {
	street: string | null;
	city: string | null;
	state: string | null;
	zip: string | null;
};

function parseAddress(formData: FormData): AddressInput | null {
	const street = formData.get('street')?.toString().trim() || null;
	const city = formData.get('city')?.toString().trim() || null;
	const state = formData.get('state')?.toString().trim() || null;
	const zip = formData.get('zip')?.toString().trim() || null;
	if (!street && !city && !state && !zip) return null;
	return { street, city, state, zip };
}

function validateLocationFields(name: string | null, notes: string | null): string | null {
	if (!name) return 'Name is required.';
	if (name.length > 100) return 'Name must be 100 characters or fewer.';
	if (notes && notes.length > 500) return 'Notes must be 500 characters or fewer.';
	return null;
}

// ─── Template helpers (Phase 3) ──────────────────────────────────────────────

const DAY_ORDER = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

function buildRrule(days: string[]): string {
	const ordered = DAY_ORDER.filter((d) => days.includes(d));
	return `FREQ=WEEKLY;BYDAY=${ordered.join(',')}`;
}

function buildDailyRrule(): string {
	return 'FREQ=DAILY';
}

function validateTemplateFields(
	name: string | null,
	templateKind: string,
	days: string[],
	windowStart: string | null,
	windowEnd: string | null,
	cutoffHours: number,
	maxOrders: number | null,
	recurrenceStartDateRaw: string | null,
	recurrenceEndDateRaw: string | null
): string | null {
	if (!name) return 'Name is required.';
	if (name.length > 100) return 'Name must be 100 characters or fewer.';
	if (templateKind === 'weekly' && days.length === 0) return 'Select at least one day.';
	if (!windowStart) return 'Start time is required.';
	if (!windowEnd) return 'End time is required.';
	if (windowEnd <= windowStart) return 'End time must be after start time.';
	if (isNaN(cutoffHours) || cutoffHours < 1) return 'Order cutoff must be at least 1 hour.';
	if (maxOrders !== null && maxOrders < 1) return 'Max orders must be at least 1.';
	// Date-bound validation. String comparison on YYYY-MM-DD is safe for ordering.
	if (recurrenceStartDateRaw && recurrenceEndDateRaw) {
		if (recurrenceEndDateRaw < recurrenceStartDateRaw) {
			return 'End date must be on or after start date.';
		}
	}
	if (recurrenceEndDateRaw && !recurrenceStartDateRaw) {
		// End-only: must be today or later (past-only end date is almost always a mistake).
		const today = new Date().toISOString().slice(0, 10);
		if (recurrenceEndDateRaw < today) {
			return 'End date must be today or later.';
		}
	}
	return null;
}

// ─── Template cascade helpers ─────────────────────────────────────────────────

async function cascadeCancelOnDeactivate(
	templateId: number,
	vendorId: number,
	now: Date
): Promise<void> {
	// Find future occurrences eligible to cancel: not already cancelled, not customized
	// (no notes, no maxOrders override), no non-cancelled orders attached.
	const futureWindows = await db
		.select({ id: pickupWindows.id })
		.from(pickupWindows)
		.where(
			and(
				eq(pickupWindows.templateId, templateId),
				eq(pickupWindows.vendorId, vendorId),
				gt(pickupWindows.endsAt, now),
				eq(pickupWindows.isCancelled, false),
				isNull(pickupWindows.notes),
				isNull(pickupWindows.maxOrders)
			)
		);

	if (futureWindows.length === 0) return;

	const candidateIds = futureWindows.map((w) => w.id);

	// Filter out windows that have non-cancelled orders attached.
	const orderfulRows = await db
		.selectDistinct({ windowId: orders.pickupWindowId })
		.from(orders)
		.where(and(inArray(orders.pickupWindowId, candidateIds), ne(orders.status, 'cancelled')));
	const orderfulIds = new Set(
		orderfulRows.map((r) => r.windowId).filter((v): v is number => v !== null)
	);

	const toCancelIds = candidateIds.filter((id) => !orderfulIds.has(id));
	if (toCancelIds.length === 0) return;

	await db
		.update(pickupWindows)
		.set({ isCancelled: true })
		.where(and(inArray(pickupWindows.id, toCancelIds), eq(pickupWindows.vendorId, vendorId)));
}

async function cascadeUncancelOnActivate(
	templateId: number,
	vendorId: number,
	now: Date
): Promise<void> {
	// Reverse the deactivate cascade. Un-cancel future rows matching the heuristic for
	// "cascade-cancelled, never customized": isCancelled = true AND no notes AND no maxOrders.
	// Rows the vendor deliberately cancelled (often have notes) stay cancelled.
	await db
		.update(pickupWindows)
		.set({ isCancelled: false })
		.where(
			and(
				eq(pickupWindows.templateId, templateId),
				eq(pickupWindows.vendorId, vendorId),
				gt(pickupWindows.endsAt, now),
				eq(pickupWindows.isCancelled, true),
				isNull(pickupWindows.notes),
				isNull(pickupWindows.maxOrders)
			)
		);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export const actions: Actions = {
	// ── Locations (Phase 2) ──────────────────────────────────────────────────

	createLocation: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim() || null;
		const notes = formData.get('notes')?.toString().trim() || null;
		const isActive = formData.get('isActive') === 'on';
		const address = parseAddress(formData);

		const error = validateLocationFields(name, notes);
		if (error) return fail(400, { error });

		const [{ maxOrder }] = await db
			.select({ maxOrder: sql<number | null>`MAX(${pickupLocations.sortOrder})` })
			.from(pickupLocations)
			.where(eq(pickupLocations.vendorId, vendorId));

		await db.insert(pickupLocations).values({
			vendorId,
			name: name!,
			notes,
			address,
			isActive,
			sortOrder: (maxOrder ?? -1) + 1
		});

		return { createSuccess: true };
	},

	updateLocation: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid location.' });

		const name = formData.get('name')?.toString().trim() || null;
		const notes = formData.get('notes')?.toString().trim() || null;
		const address = parseAddress(formData);

		const error = validateLocationFields(name, notes);
		if (error) return fail(400, { error, updateId: id });

		const existing = await db.query.pickupLocations.findFirst({
			where: and(eq(pickupLocations.id, id), eq(pickupLocations.vendorId, vendorId))
		});
		if (!existing) return fail(403, { error: 'Location not found.', updateId: id });

		await db
			.update(pickupLocations)
			.set({ name: name!, notes, address })
			.where(and(eq(pickupLocations.id, id), eq(pickupLocations.vendorId, vendorId)));

		return { updateSuccess: true };
	},

	toggleActive: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid location.' });

		const existing = await db.query.pickupLocations.findFirst({
			where: and(eq(pickupLocations.id, id), eq(pickupLocations.vendorId, vendorId))
		});
		if (!existing) return fail(403, { error: 'Location not found.' });

		await db
			.update(pickupLocations)
			.set({ isActive: !existing.isActive })
			.where(and(eq(pickupLocations.id, id), eq(pickupLocations.vendorId, vendorId)));

		return { toggleSuccess: true };
	},

	// ── Window templates (Phase 3) ───────────────────────────────────────────

	createTemplate: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim() || null;
		const locationIdRaw = formData.get('locationId')?.toString() || '';
		const templateKind = formData.get('templateKind')?.toString() || 'weekly';
		const days = formData.getAll('days').map(String);
		const windowStart = formData.get('windowStart')?.toString() || null;
		const windowEnd = formData.get('windowEnd')?.toString() || null;
		const cutoffHours = parseInt(formData.get('cutoffHours')?.toString() ?? '48');
		const maxOrdersRaw = formData.get('maxOrders')?.toString().trim() || '';
		const recurrenceStartDateRaw = formData.get('recurrenceStartDate')?.toString().trim() || null;
		const recurrenceEndDateRaw = formData.get('recurrenceEndDate')?.toString().trim() || null;
		const isActive = formData.get('isActive') === 'on';

		const maxOrders = maxOrdersRaw ? parseInt(maxOrdersRaw) : null;
		const error = validateTemplateFields(
			name,
			templateKind,
			days,
			windowStart,
			windowEnd,
			cutoffHours,
			maxOrders,
			recurrenceStartDateRaw,
			recurrenceEndDateRaw
		);
		if (error) return fail(400, { templateError: error });

		let locationId: number | null = null;
		if (locationIdRaw) {
			locationId = parseInt(locationIdRaw);
			if (isNaN(locationId)) return fail(400, { templateError: 'Invalid location.' });
			const loc = await db.query.pickupLocations.findFirst({
				where: and(eq(pickupLocations.id, locationId), eq(pickupLocations.vendorId, vendorId))
			});
			if (!loc) return fail(403, { templateError: 'Location not found.' });
		}

		// Resolve raw date strings to TIMESTAMPTZ at start-of-day in vendor TZ.
		// Query timezone fresh (don't trust locals.vendor — derivation-fresh convention).
		const vendorRecord = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { timezone: true }
		});
		if (!vendorRecord) return fail(500, { templateError: 'Vendor record missing.' });

		const recurrenceStartDate = recurrenceStartDateRaw
			? startOfDayInTZ(recurrenceStartDateRaw, vendorRecord.timezone)
			: null;
		const recurrenceEndDate = recurrenceEndDateRaw
			? startOfDayInTZ(recurrenceEndDateRaw, vendorRecord.timezone)
			: null;

		const recurrence = templateKind === 'daily' ? buildDailyRrule() : buildRrule(days);

		const [{ id: newTemplateId }] = await db
			.insert(pickupWindowTemplates)
			.values({
				vendorId,
				locationId,
				name: name!,
				recurrence,
				windowStart: windowStart!,
				windowEnd: windowEnd!,
				cutoffHours,
				maxOrders,
				isActive,
				recurrenceStartDate,
				recurrenceEndDate,
				exdates: []
			})
			.returning({ id: pickupWindowTemplates.id });

		await materializeTemplate(newTemplateId);

		return { createTemplateSuccess: true };
	},

	updateTemplate: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { templateError: 'Invalid template.' });

		const name = formData.get('name')?.toString().trim() || null;
		const locationIdRaw = formData.get('locationId')?.toString() || '';
		const templateKind = formData.get('templateKind')?.toString() || 'weekly';
		const days = formData.getAll('days').map(String);
		const windowStart = formData.get('windowStart')?.toString() || null;
		const windowEnd = formData.get('windowEnd')?.toString() || null;
		const cutoffHours = parseInt(formData.get('cutoffHours')?.toString() ?? '48');
		const maxOrdersRaw = formData.get('maxOrders')?.toString().trim() || '';
		const maxOrders = maxOrdersRaw ? parseInt(maxOrdersRaw) : null;
		const recurrenceStartDateRaw = formData.get('recurrenceStartDate')?.toString().trim() || null;
		const recurrenceEndDateRaw = formData.get('recurrenceEndDate')?.toString().trim() || null;
		const exdatesRaw = formData.get('exdates')?.toString() || '[]';
		let exdates: string[] = [];
		try {
			const parsed = JSON.parse(exdatesRaw);
			if (
				Array.isArray(parsed) &&
				parsed.every((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))
			) {
				exdates = parsed;
			}
		} catch {
			// malformed JSON — treat as empty
		}

		const error = validateTemplateFields(
			name,
			templateKind,
			days,
			windowStart,
			windowEnd,
			cutoffHours,
			maxOrders,
			recurrenceStartDateRaw,
			recurrenceEndDateRaw
		);
		if (error) return fail(400, { templateError: error });

		// IDOR guard
		const existing = await db.query.pickupWindowTemplates.findFirst({
			where: and(eq(pickupWindowTemplates.id, id), eq(pickupWindowTemplates.vendorId, vendorId))
		});
		if (!existing) return fail(403, { templateError: 'Template not found.' });

		let locationId: number | null = null;
		if (locationIdRaw) {
			locationId = parseInt(locationIdRaw);
			if (isNaN(locationId)) return fail(400, { templateError: 'Invalid location.' });
			const loc = await db.query.pickupLocations.findFirst({
				where: and(eq(pickupLocations.id, locationId), eq(pickupLocations.vendorId, vendorId))
			});
			if (!loc) return fail(403, { templateError: 'Location not found.' });
		}

		// Resolve raw date strings to TIMESTAMPTZ at start-of-day in vendor TZ.
		// Query timezone fresh (don't trust locals.vendor — derivation-fresh convention).
		const vendorRecord = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { timezone: true }
		});
		if (!vendorRecord) return fail(500, { templateError: 'Vendor record missing.' });

		const recurrenceStartDate = recurrenceStartDateRaw
			? startOfDayInTZ(recurrenceStartDateRaw, vendorRecord.timezone)
			: null;
		const recurrenceEndDate = recurrenceEndDateRaw
			? startOfDayInTZ(recurrenceEndDateRaw, vendorRecord.timezone)
			: null;

		const recurrence = templateKind === 'daily' ? buildDailyRrule() : buildRrule(days);

		await db
			.update(pickupWindowTemplates)
			.set({
				locationId,
				name: name!,
				recurrence,
				windowStart: windowStart!,
				windowEnd: windowEnd!,
				cutoffHours,
				maxOrders,
				recurrenceStartDate,
				recurrenceEndDate,
				exdates
			})
			.where(and(eq(pickupWindowTemplates.id, id), eq(pickupWindowTemplates.vendorId, vendorId)));

		await materializeTemplate(id);

		return { updateTemplateSuccess: true };
	},

	toggleTemplateActive: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { templateError: 'Invalid template.' });

		const existing = await db.query.pickupWindowTemplates.findFirst({
			where: and(eq(pickupWindowTemplates.id, id), eq(pickupWindowTemplates.vendorId, vendorId))
		});
		if (!existing) return fail(403, { templateError: 'Template not found.' });

		const now = new Date();
		const newIsActive = !existing.isActive;

		await db
			.update(pickupWindowTemplates)
			.set({ isActive: newIsActive })
			.where(and(eq(pickupWindowTemplates.id, id), eq(pickupWindowTemplates.vendorId, vendorId)));

		if (newIsActive === false) {
			await cascadeCancelOnDeactivate(id, vendorId, now);
		} else {
			await cascadeUncancelOnActivate(id, vendorId, now);
		}

		await materializeTemplate(id);

		return { toggleTemplateSuccess: true };
	},

	// ── Per-occurrence overrides (Phase 8) ──────────────────────────────────

	updateOccurrence: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const id = parseInt(formData.get('occurrenceId')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { occurrenceError: 'Invalid occurrence.' });

		// IDOR guard
		const win = await db.query.pickupWindows.findFirst({
			where: and(eq(pickupWindows.id, id), eq(pickupWindows.vendorId, vendorId))
		});
		if (!win) return fail(403, { occurrenceError: 'Occurrence not found.' });

		// Fetch template default for maxOrders normalization
		const tmpl = win.templateId
			? await db.query.pickupWindowTemplates.findFirst({
					where: eq(pickupWindowTemplates.id, win.templateId),
					columns: { maxOrders: true }
				})
			: null;
		const templateDefaultMaxOrders = tmpl?.maxOrders ?? null;

		// isCancelled: checkbox sends 'true' when checked; absent when unchecked → false
		const isCancelled = formData.get('isCancelled') === 'true';

		// maxOrders: blank → null; value matching template default → null (not a meaningful override)
		const maxOrdersRaw = formData.get('maxOrders')?.toString().trim() ?? '';
		let maxOrders: number | null = null;
		if (maxOrdersRaw !== '') {
			const parsed = parseInt(maxOrdersRaw);
			if (isNaN(parsed) || parsed < 1)
				return fail(400, { occurrenceError: 'Capacity must be at least 1.' });
			maxOrders = parsed !== templateDefaultMaxOrders ? parsed : null;
		}

		// notes: blank/whitespace-only → null
		const notesRaw = formData.get('notes')?.toString().trim() ?? '';
		if (notesRaw.length > 500)
			return fail(400, { occurrenceError: 'Notes must be 500 characters or fewer.' });
		const notes = notesRaw || null;

		await db
			.update(pickupWindows)
			.set({ isCancelled, maxOrders, notes })
			.where(and(eq(pickupWindows.id, id), eq(pickupWindows.vendorId, vendorId)));

		return { updateOccurrenceSuccess: true };
	},

	// Hard delete: only allowed when the template has no future non-cancelled orders attached
	// to any of its occurrences. If commitments exist, returns a 400 error explaining why.
	// On success: deletes future un-orderful windows, then deletes the template row.
	// Past pickup_windows get templateId set to NULL via ON DELETE SET NULL (schema default).
	deleteTemplate: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { templateError: 'Invalid template.' });

		const existing = await db.query.pickupWindowTemplates.findFirst({
			where: and(eq(pickupWindowTemplates.id, id), eq(pickupWindowTemplates.vendorId, vendorId))
		});
		if (!existing) return fail(403, { templateError: 'Template not found.' });

		const now = new Date();

		// Check for future commitments before deleting.
		const futureWindowIds = await db
			.select({ id: pickupWindows.id })
			.from(pickupWindows)
			.where(
				and(
					eq(pickupWindows.templateId, id),
					eq(pickupWindows.vendorId, vendorId),
					gt(pickupWindows.endsAt, now)
				)
			);

		if (futureWindowIds.length > 0) {
			const windowIds = futureWindowIds.map((w) => w.id);
			const commitments = await db
				.select({ id: orders.id })
				.from(orders)
				.where(and(inArray(orders.pickupWindowId, windowIds), ne(orders.status, 'cancelled')))
				.limit(1);

			if (commitments.length > 0) {
				return fail(400, {
					templateError:
						"Cannot delete: this template has future orders attached. Deactivate it instead — orders will be honored, but customers won't see new pickup dates from this template."
				});
			}

			// No commitments — safe to delete the future un-orderful windows.
			await db
				.delete(pickupWindows)
				.where(and(inArray(pickupWindows.id, windowIds), eq(pickupWindows.vendorId, vendorId)));
		}

		// Delete the template row. Past pickup_windows with templateId = id get their
		// templateId set to NULL via the schema's ON DELETE SET NULL.
		await db
			.delete(pickupWindowTemplates)
			.where(and(eq(pickupWindowTemplates.id, id), eq(pickupWindowTemplates.vendorId, vendorId)));

		return { deleteTemplateSuccess: true };
	}
};
