import { describe, it, expect } from 'vitest';
import { expandTemplate, startOfDayInTZ } from './expand';

// All tests use America/New_York (EDT = UTC-4 in Apr/May, EST = UTC-5 in winter).
// windowStart: '09:00' in EDT = 13:00Z. windowEnd: '11:00' in EDT = 15:00Z.
const TZ = 'America/New_York';

describe('expandTemplate', () => {
	it('weekly BYDAY=SA parity — 3 Saturdays from Apr 15 2026', () => {
		const result = expandTemplate({
			recurrence: 'FREQ=WEEKLY;BYDAY=SA',
			windowStart: '09:00',
			windowEnd: '11:00',
			cutoffHours: 48,
			vendorTimezone: TZ,
			count: 3,
			fromDate: new Date('2026-04-15T00:00:00Z')
		});

		expect(result).toHaveLength(3);
		// Apr 18, 25, May 2 — all at 9am EDT = 13:00Z
		expect(result[0].startsAt.toISOString()).toBe('2026-04-18T13:00:00.000Z');
		expect(result[0].endsAt.toISOString()).toBe('2026-04-18T15:00:00.000Z');
		expect(result[0].cutoffAt.toISOString()).toBe('2026-04-16T13:00:00.000Z');

		expect(result[1].startsAt.toISOString()).toBe('2026-04-25T13:00:00.000Z');
		expect(result[2].startsAt.toISOString()).toBe('2026-05-02T13:00:00.000Z');
	});

	it('multiple BYDAY values — TU,TH interleaved', () => {
		const result = expandTemplate({
			recurrence: 'FREQ=WEEKLY;BYDAY=TU,TH',
			windowStart: '09:00',
			windowEnd: '11:00',
			cutoffHours: 0,
			vendorTimezone: TZ,
			count: 4,
			fromDate: new Date('2026-04-20T00:00:00Z') // Monday Apr 20
		});

		expect(result).toHaveLength(4);
		// Derive UTC calendar day from noon-anchored UTC startsAt date
		const utcDays = result.map((r) => {
			// startsAt is 13:00Z on the occurrence day — getUTCDay() is reliable
			const d = new Date(r.startsAt);
			d.setUTCHours(12, 0, 0, 0); // re-anchor to noon to get the day
			return d.getUTCDay();
		});
		expect(utcDays).toEqual([2, 4, 2, 4]); // Tue=2, Thu=4, Tue, Thu
	});

	it('FREQ=DAILY — 7 consecutive days', () => {
		const fromDate = new Date('2026-04-20T00:00:00Z');
		const result = expandTemplate({
			recurrence: 'FREQ=DAILY',
			windowStart: '09:00',
			windowEnd: '11:00',
			cutoffHours: 0,
			vendorTimezone: TZ,
			count: 7,
			fromDate
		});

		expect(result).toHaveLength(7);
		// First occurrence: Apr 20 at 9am EDT = 13:00Z (after fromDate 00:00Z)
		expect(result[0].startsAt.toISOString().slice(0, 10)).toBe('2026-04-20');
		expect(result[6].startsAt.toISOString().slice(0, 10)).toBe('2026-04-26');
		// Consecutive days are 24h apart (no DST change in this window)
		for (let i = 1; i < 7; i++) {
			const diff = result[i].startsAt.getTime() - result[i - 1].startsAt.getTime();
			expect(diff).toBe(24 * 3_600_000);
		}
	});

	it('EXDATE skipping — skips the second day', () => {
		const fromDate = new Date('2026-04-20T00:00:00Z');
		// Skip Apr 21 by passing its noon-UTC anchor
		const skipApr21 = new Date(Date.UTC(2026, 3, 21, 12, 0, 0));

		const result = expandTemplate({
			recurrence: 'FREQ=DAILY',
			windowStart: '09:00',
			windowEnd: '11:00',
			cutoffHours: 0,
			vendorTimezone: TZ,
			count: 5,
			fromDate,
			exdates: [skipApr21]
		});

		expect(result).toHaveLength(5);
		// Apr 21 must not appear
		const dates = result.map((r) => r.startsAt.toISOString().slice(0, 10));
		expect(dates).not.toContain('2026-04-21');
		// Apr 20 is first, Apr 22 is second
		expect(dates[0]).toBe('2026-04-20');
		expect(dates[1]).toBe('2026-04-22');
	});

	it('recurrenceStart boundary — skips Saturdays before the bound', () => {
		// Saturdays from Apr 15: Apr 18, Apr 25, May 2, May 9, May 16, May 23
		// recurrenceStart = May 6 → first valid Saturday is May 9
		const recurrenceStart = startOfDayInTZ('2026-05-06', TZ);

		const result = expandTemplate({
			recurrence: 'FREQ=WEEKLY;BYDAY=SA',
			windowStart: '09:00',
			windowEnd: '11:00',
			cutoffHours: 0,
			vendorTimezone: TZ,
			count: 3,
			fromDate: new Date('2026-04-15T00:00:00Z'),
			recurrenceStart
		});

		expect(result).toHaveLength(3);
		expect(result[0].startsAt.toISOString().slice(0, 10)).toBe('2026-05-09');
		expect(result[1].startsAt.toISOString().slice(0, 10)).toBe('2026-05-16');
		expect(result[2].startsAt.toISOString().slice(0, 10)).toBe('2026-05-23');
	});

	it('recurrenceEnd boundary — stops after the bound', () => {
		// End after Apr 25 → only Apr 18 and Apr 25
		// startOfDayInTZ('2026-05-02', TZ) = May 1 midnight EDT = 2026-05-01T04:00:00Z
		// Apr 25 at 9am EDT (13:00Z) < May 1 04:00Z → included
		// May 2 at 9am EDT (13:00Z) > May 1 04:00Z → breaks
		const recurrenceEnd = startOfDayInTZ('2026-05-02', TZ);

		const result = expandTemplate({
			recurrence: 'FREQ=WEEKLY;BYDAY=SA',
			windowStart: '09:00',
			windowEnd: '11:00',
			cutoffHours: 0,
			vendorTimezone: TZ,
			count: 10,
			fromDate: new Date('2026-04-15T00:00:00Z'),
			recurrenceEnd
		});

		expect(result).toHaveLength(2);
		expect(result[0].startsAt.toISOString().slice(0, 10)).toBe('2026-04-18');
		expect(result[1].startsAt.toISOString().slice(0, 10)).toBe('2026-04-25');
	});

	it('empty exdates array — identical output to no exdates', () => {
		const base = expandTemplate({
			recurrence: 'FREQ=WEEKLY;BYDAY=SA',
			windowStart: '09:00',
			windowEnd: '11:00',
			cutoffHours: 48,
			vendorTimezone: TZ,
			count: 3,
			fromDate: new Date('2026-04-15T00:00:00Z')
		});

		const withEmpty = expandTemplate({
			recurrence: 'FREQ=WEEKLY;BYDAY=SA',
			windowStart: '09:00',
			windowEnd: '11:00',
			cutoffHours: 48,
			vendorTimezone: TZ,
			count: 3,
			fromDate: new Date('2026-04-15T00:00:00Z'),
			exdates: []
		});

		expect(withEmpty).toHaveLength(base.length);
		for (let i = 0; i < base.length; i++) {
			expect(withEmpty[i].startsAt.toISOString()).toBe(base[i].startsAt.toISOString());
			expect(withEmpty[i].endsAt.toISOString()).toBe(base[i].endsAt.toISOString());
		}
	});
});
