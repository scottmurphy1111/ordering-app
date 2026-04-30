import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, asc, gt, sql } from 'drizzle-orm';
import { pickupLocations, pickupWindowTemplates, pickupWindows } from '$lib/server/db/pickup';
import { materializeTemplate } from '$lib/server/pickup/materialize';

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
			where: and(
				eq(pickupWindowTemplates.vendorId, vendorId),
				eq(pickupWindowTemplates.isActive, true)
			),
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

	return { locations, templates, timezone, upcomingByTemplate };
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

function validateTemplateFields(
	name: string | null,
	days: string[],
	windowStart: string | null,
	windowEnd: string | null,
	cutoffHours: number,
	maxOrders: number | null
): string | null {
	if (!name) return 'Name is required.';
	if (name.length > 100) return 'Name must be 100 characters or fewer.';
	if (days.length === 0) return 'Select at least one day.';
	if (!windowStart) return 'Start time is required.';
	if (!windowEnd) return 'End time is required.';
	if (windowEnd <= windowStart) return 'End time must be after start time.';
	if (isNaN(cutoffHours) || cutoffHours < 1) return 'Order cutoff must be at least 1 hour.';
	if (maxOrders !== null && maxOrders < 1) return 'Max orders must be at least 1.';
	return null;
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
		const days = formData.getAll('days').map(String);
		const windowStart = formData.get('windowStart')?.toString() || null;
		const windowEnd = formData.get('windowEnd')?.toString() || null;
		const cutoffHours = parseInt(formData.get('cutoffHours')?.toString() ?? '48');
		const maxOrdersRaw = formData.get('maxOrders')?.toString().trim() || '';
		const isActive = formData.get('isActive') === 'on';

		const maxOrders = maxOrdersRaw ? parseInt(maxOrdersRaw) : null;
		const error = validateTemplateFields(name, days, windowStart, windowEnd, cutoffHours, maxOrders);
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

		const [{ id: newTemplateId }] = await db
			.insert(pickupWindowTemplates)
			.values({
				vendorId,
				locationId,
				name: name!,
				recurrence: buildRrule(days),
				windowStart: windowStart!,
				windowEnd: windowEnd!,
				cutoffHours,
				maxOrders,
				isActive
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
		const days = formData.getAll('days').map(String);
		const windowStart = formData.get('windowStart')?.toString() || null;
		const windowEnd = formData.get('windowEnd')?.toString() || null;
		const cutoffHours = parseInt(formData.get('cutoffHours')?.toString() ?? '48');
		const maxOrdersRaw = formData.get('maxOrders')?.toString().trim() || '';
		const maxOrders = maxOrdersRaw ? parseInt(maxOrdersRaw) : null;

		const error = validateTemplateFields(name, days, windowStart, windowEnd, cutoffHours, maxOrders);
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

		await db
			.update(pickupWindowTemplates)
			.set({
				locationId,
				name: name!,
				recurrence: buildRrule(days),
				windowStart: windowStart!,
				windowEnd: windowEnd!,
				cutoffHours,
				maxOrders
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

		await db
			.update(pickupWindowTemplates)
			.set({ isActive: !existing.isActive })
			.where(and(eq(pickupWindowTemplates.id, id), eq(pickupWindowTemplates.vendorId, vendorId)));

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

	// Soft delete: sets is_active = false. The template is hidden from the UI immediately.
	// Phase 4 note: when materializing occurrences, skip templates where is_active = false.
	// Existing materialized pickup_windows rows from this template are NOT touched — they
	// continue on their own schedule until they pass naturally.
	deleteTemplate: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { templateError: 'Invalid template.' });

		const existing = await db.query.pickupWindowTemplates.findFirst({
			where: and(eq(pickupWindowTemplates.id, id), eq(pickupWindowTemplates.vendorId, vendorId))
		});
		if (!existing) return fail(403, { templateError: 'Template not found.' });

		await db
			.update(pickupWindowTemplates)
			.set({ isActive: false })
			.where(and(eq(pickupWindowTemplates.id, id), eq(pickupWindowTemplates.vendorId, vendorId)));

		return { deleteTemplateSuccess: true };
	}
};
