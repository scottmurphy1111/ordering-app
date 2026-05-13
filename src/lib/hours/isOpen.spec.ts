import { describe, it, expect } from 'vitest';
import { isVendorOpen } from './isOpen';
import type { HoursRow, ExceptionRow } from './isOpen';

// All tests default to America/New_York in EDT (UTC-4, May 2026).
// 2026-05-04 = Monday. 2026-05-05 = Tuesday.
// EDT offsets: 7:00 AM local = 11:00 UTC, 6:00 PM local = 22:00 UTC.
const TZ = 'America/New_York';

// Helper: Monday 7am-6pm recurring row
const monRow: HoursRow = { dayOfWeek: 'monday', openTime: '07:00:00', closeTime: '18:00:00' };

describe('isVendorOpen', () => {
	it('returns isOpen=true when within regular hours', () => {
		// 11:00 AM EDT (15:00 UTC) on a Monday — within 7am–6pm
		const at = new Date('2026-05-04T15:00:00Z');
		const result = isVendorOpen([monRow], [], TZ, at);

		expect(result.isOpen).toBe(true);
		if (result.isOpen) {
			// Closes at 6:00 PM EDT = 22:00 UTC
			expect(result.closesAt.toISOString()).toBe('2026-05-04T22:00:00.000Z');
		}
	});

	it('returns isOpen=false with opensAt when before opening time', () => {
		// 7:00 AM EDT (11:00 UTC) on a Monday — hours start at 11:00 AM EDT
		const lateOpenRow: HoursRow = {
			dayOfWeek: 'monday',
			openTime: '11:00:00',
			closeTime: '18:00:00'
		};
		const at = new Date('2026-05-04T11:00:00Z'); // 7:00 AM EDT
		const result = isVendorOpen([lateOpenRow], [], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			// Opens at 11:00 AM EDT = 15:00 UTC
			expect(result.opensAt?.toISOString()).toBe('2026-05-04T15:00:00.000Z');
		}
	});

	it('returns isOpen=false with next open time when past all hours today', () => {
		// 6:00 PM EDT (22:00 UTC) on Monday — hours end at 2:00 PM EDT.
		// Forward scan finds next Monday (2026-05-11) at 7:00 AM EDT.
		const earlyCloseRow: HoursRow = {
			dayOfWeek: 'monday',
			openTime: '07:00:00',
			closeTime: '14:00:00'
		};
		const at = new Date('2026-05-04T22:00:00Z'); // 6:00 PM EDT
		const result = isVendorOpen([earlyCloseRow], [], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			// Next Monday 2026-05-11 at 7:00 AM EDT = 11:00 UTC
			expect(result.opensAt?.toISOString()).toBe('2026-05-11T11:00:00.000Z');
		}
	});

	it('returns isOpen=false with next open time when no hours entry exists for today', () => {
		// Tuesday row only; evaluating on Monday 11:00 AM EDT.
		// Forward scan finds Tuesday (2026-05-05) at 7:00 AM EDT.
		const tuesdayRow: HoursRow = {
			dayOfWeek: 'tuesday',
			openTime: '07:00:00',
			closeTime: '18:00:00'
		};
		const at = new Date('2026-05-04T15:00:00Z'); // Monday 11:00 AM EDT
		const result = isVendorOpen([tuesdayRow], [], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			// Tuesday 2026-05-05 at 7:00 AM EDT = 11:00 UTC
			expect(result.opensAt?.toISOString()).toBe('2026-05-05T11:00:00.000Z');
		}
	});

	it('returns isOpen=false when a closed exception exists for today, forward scans to next open day', () => {
		// Regular hours say open on Monday; exception marks 2026-05-04 (Monday) closed.
		// Forward scan skips to next Monday (2026-05-11) at 7:00 AM EDT.
		const exception: ExceptionRow = {
			date: '2026-05-04',
			isClosed: true,
			openTime: null,
			closeTime: null
		};
		const at = new Date('2026-05-04T15:00:00Z'); // normally open
		const result = isVendorOpen([monRow], [exception], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			// Next Monday 2026-05-11 at 7:00 AM EDT = 11:00 UTC
			expect(result.opensAt?.toISOString()).toBe('2026-05-11T11:00:00.000Z');
		}
	});

	it('uses exception custom hours instead of regular hours', () => {
		// Regular hours: 7am–2pm. Exception: 10am–4pm. Evaluate at 2:30 PM (normally closed).
		const earlyCloseRow: HoursRow = {
			dayOfWeek: 'monday',
			openTime: '07:00:00',
			closeTime: '14:00:00'
		};
		const exception: ExceptionRow = {
			date: '2026-05-04',
			isClosed: false,
			openTime: '10:00:00',
			closeTime: '16:00:00' // 4:00 PM EDT = 20:00 UTC
		};
		const at = new Date('2026-05-04T18:30:00Z'); // 2:30 PM EDT — past regular close, within exception
		const result = isVendorOpen([earlyCloseRow], [exception], TZ, at);

		expect(result.isOpen).toBe(true);
		if (result.isOpen) {
			// Closes at 4:00 PM EDT = 20:00 UTC
			expect(result.closesAt.toISOString()).toBe('2026-05-04T20:00:00.000Z');
		}
	});

	it('returns isOpen=false between two split shifts', () => {
		// Two shifts: 7am–12pm and 3pm–8pm. Evaluate at 1:30 PM (in the gap).
		const morning: HoursRow = { dayOfWeek: 'monday', openTime: '07:00:00', closeTime: '12:00:00' };
		const afternoon: HoursRow = {
			dayOfWeek: 'monday',
			openTime: '15:00:00',
			closeTime: '20:00:00'
		};
		const at = new Date('2026-05-04T17:30:00Z'); // 1:30 PM EDT
		const result = isVendorOpen([morning, afternoon], [], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			// Next shift opens at 3:00 PM EDT = 19:00 UTC
			expect(result.opensAt?.toISOString()).toBe('2026-05-04T19:00:00.000Z');
		}
	});

	it('correctly resolves timezone — same UTC moment is different days in different zones', () => {
		// 2026-05-05T03:00:00Z = Monday 11:00 PM EDT (closed) = Monday 8:00 PM PDT (open)
		// America/Los_Angeles, Monday hours 9am–11pm PDT
		const pdtRow: HoursRow = { dayOfWeek: 'monday', openTime: '09:00:00', closeTime: '23:00:00' };

		const at = new Date('2026-05-05T03:00:00Z'); // 11:00 PM EDT — past Monday in New York

		// In LA it's still Monday (8:00 PM PDT) and within hours
		const laResult = isVendorOpen([pdtRow], [], 'America/Los_Angeles', at);
		expect(laResult.isOpen).toBe(true);

		// In New York it's already Tuesday with no Tuesday hours
		const nyResult = isVendorOpen([pdtRow], [], TZ, at);
		expect(nyResult.isOpen).toBe(false);
	});

	// ── Forward-week scan tests ───────────────────────────────────────────────

	it('forward-scan: closed today, returns next-day open time', () => {
		// Sunday has no hours. Monday 9am–5pm. Evaluate Sunday 8pm EDT.
		// 2026-05-03 = Sunday in EDT. 2026-05-04 = Monday.
		const monRow: HoursRow = { dayOfWeek: 'monday', openTime: '09:00:00', closeTime: '17:00:00' };
		const at = new Date('2026-05-04T00:00:00Z'); // Sunday 8pm EDT
		const result = isVendorOpen([monRow], [], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			// Monday 9am EDT = 13:00 UTC
			expect(result.opensAt?.toISOString()).toBe('2026-05-04T13:00:00.000Z');
		}
	});

	it('forward-scan: closed today and tomorrow, finds day-after open time', () => {
		// Friday only row. Evaluate Monday 8pm EDT (no Monday hours, no Tuesday, no Wed, no Thu).
		// 2026-05-04 = Monday. Friday = 2026-05-08.
		const friRow: HoursRow = { dayOfWeek: 'friday', openTime: '08:00:00', closeTime: '16:00:00' };
		const at = new Date('2026-05-05T00:00:00Z'); // Monday 8pm EDT
		const result = isVendorOpen([friRow], [], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			// Friday 8am EDT = 12:00 UTC
			expect(result.opensAt?.toISOString()).toBe('2026-05-08T12:00:00.000Z');
		}
	});

	it('forward-scan: future exception isClosed=true is skipped, falls through to next open day', () => {
		// Sunday (2026-05-03) closed. Monday (2026-05-04) has regular 9am hours but
		// exception marks Monday as closed. Tuesday (2026-05-05) has regular 10am hours.
		const monRow: HoursRow = { dayOfWeek: 'monday', openTime: '09:00:00', closeTime: '17:00:00' };
		const tueRow: HoursRow = { dayOfWeek: 'tuesday', openTime: '10:00:00', closeTime: '17:00:00' };
		const monException: ExceptionRow = {
			date: '2026-05-04',
			isClosed: true,
			openTime: null,
			closeTime: null
		};
		const at = new Date('2026-05-04T00:00:00Z'); // Sunday 8pm EDT
		const result = isVendorOpen([monRow, tueRow], [monException], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			// Tuesday 10am EDT = 14:00 UTC
			expect(result.opensAt?.toISOString()).toBe('2026-05-05T14:00:00.000Z');
		}
	});

	it('forward-scan: future exception with custom hours uses exception open time', () => {
		// Sunday closed. Monday exception sets 10am–2pm (instead of regular 9am–5pm).
		const monRow: HoursRow = { dayOfWeek: 'monday', openTime: '09:00:00', closeTime: '17:00:00' };
		const monException: ExceptionRow = {
			date: '2026-05-04',
			isClosed: false,
			openTime: '10:00:00',
			closeTime: '14:00:00'
		};
		const at = new Date('2026-05-04T00:00:00Z'); // Sunday 8pm EDT
		const result = isVendorOpen([monRow], [monException], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			// Monday 10am EDT = 14:00 UTC (exception time, not regular 9am)
			expect(result.opensAt?.toISOString()).toBe('2026-05-04T14:00:00.000Z');
		}
	});

	it('forward-scan: no hours within 7 days returns opensAt=null', () => {
		// No rows at all. Evaluate any time.
		const at = new Date('2026-05-04T15:00:00Z');
		const result = isVendorOpen([], [], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			expect(result.opensAt).toBeNull();
		}
	});
});
