/**
 * Expands a pickup window template into concrete upcoming occurrences.
 *
 * Example input → output:
 *   expandTemplate({
 *     recurrence: 'FREQ=WEEKLY;BYDAY=SA',
 *     windowStart: '09:00',
 *     windowEnd: '11:00',
 *     cutoffHours: 48,
 *     vendorTimezone: 'America/New_York',
 *     count: 3,
 *   })
 *   // → [
 *   //   { startsAt: 2025-05-03T13:00:00Z, endsAt: 2025-05-03T15:00:00Z, cutoffAt: 2025-05-01T13:00:00Z },
 *   //   { startsAt: 2025-05-10T13:00:00Z, ... },
 *   //   { startsAt: 2025-05-17T13:00:00Z, ... },
 *   // ]
 *   // Sat May 3 at 9am EDT (UTC-4) = 13:00Z; cutoff 48h earlier = Thu May 1 9am EDT.
 *
 * Phase 4 note: this function is pure (no DB, no side effects). The materialization
 * job should call it with fromDate = last materialized occurrence date, then insert
 * the returned rows into pickup_windows. Only call for templates where is_active = true.
 */
import { RRule, type Weekday } from 'rrule';

export type ExpandTemplateInput = {
	recurrence: string; // RRULE fragment, e.g. "FREQ=WEEKLY;BYDAY=SA,TH"
	windowStart: string; // "HH:MM" wall-clock in vendor TZ (from DB time column)
	windowEnd: string; // "HH:MM" wall-clock in vendor TZ
	cutoffHours: number;
	vendorTimezone: string; // IANA identifier, e.g. "America/New_York"
	count: number; // how many upcoming occurrences to return
	fromDate?: Date; // defaults to now(); occurrences at or before this are skipped
};

export type ExpandedOccurrence = {
	startsAt: Date; // UTC, ready for TIMESTAMPTZ storage
	endsAt: Date; // UTC
	cutoffAt: Date; // UTC = startsAt − cutoffHours
};

const BYDAY_MAP: Record<string, Weekday> = {
	MO: RRule.MO,
	TU: RRule.TU,
	WE: RRule.WE,
	TH: RRule.TH,
	FR: RRule.FR,
	SA: RRule.SA,
	SU: RRule.SU
};

/**
 * Converts a wall-clock time on an RRule occurrence date to a UTC Date.
 *
 * Uses getUTC* on the RRule date (RRule anchors dtstart at noon UTC so the
 * UTC calendar date always matches the intended local calendar day) and the
 * Intl offset-correction trick — no date-fns-tz or extra dependencies needed.
 */
function wallClockToUtc(rruleDate: Date, timeHHMM: string, ianaTimezone: string): Date {
	const year = rruleDate.getUTCFullYear();
	const month = rruleDate.getUTCMonth() + 1;
	const day = rruleDate.getUTCDate();
	const [hours, minutes] = timeHHMM.split(':').map(Number);

	// Treat wall-clock time as UTC first (wrong, but a useful starting point)
	const approxUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

	// Find what hour/minute approxUtc actually is in the vendor's timezone
	const parts = new Intl.DateTimeFormat('en', {
		timeZone: ianaTimezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).formatToParts(approxUtc);

	const localH = parseInt(parts.find((p) => p.type === 'hour')!.value);
	const localM = parseInt(parts.find((p) => p.type === 'minute')!.value);
	const normH = localH === 24 ? 0 : localH; // Intl returns 24 for midnight in some locales

	// Shift approxUtc by the difference between target and actual local time
	const diffMs = ((hours - normH) * 60 + (minutes - localM)) * 60_000;
	return new Date(approxUtc.getTime() + diffMs);
}

export function expandTemplate(input: ExpandTemplateInput): ExpandedOccurrence[] {
	const fromDate = input.fromDate ?? new Date();

	const bydayMatch = input.recurrence.match(/BYDAY=([A-Z,]+)/);
	const byday = bydayMatch ? bydayMatch[1].split(',').map((d) => BYDAY_MAP[d]).filter(Boolean) : [];

	if (byday.length === 0) return [];

	// Anchor dtstart at noon UTC so the UTC calendar date always equals the
	// intended local calendar day regardless of the vendor's timezone offset.
	const dtstart = new Date(
		Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate(), 12, 0, 0)
	);

	// Overfetch slightly — a few occurrences on fromDate itself may be in the past
	const rule = new RRule({ freq: RRule.WEEKLY, byweekday: byday, dtstart, count: input.count + 5 });

	const results: ExpandedOccurrence[] = [];

	for (const occ of rule.all()) {
		const startsAt = wallClockToUtc(occ, input.windowStart, input.vendorTimezone);
		if (startsAt <= fromDate) continue;

		const endsAt = wallClockToUtc(occ, input.windowEnd, input.vendorTimezone);
		const cutoffAt = new Date(startsAt.getTime() - input.cutoffHours * 3_600_000);

		results.push({ startsAt, endsAt, cutoffAt });
		if (results.length >= input.count) break;
	}

	return results;
}
