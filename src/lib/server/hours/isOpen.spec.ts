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

	it('returns isOpen=false with opensAt=null when past all hours today', () => {
		// 6:00 PM EDT (22:00 UTC) on a Monday — hours end at 2:00 PM EDT
		const earlyCloseRow: HoursRow = {
			dayOfWeek: 'monday',
			openTime: '07:00:00',
			closeTime: '14:00:00'
		};
		const at = new Date('2026-05-04T22:00:00Z'); // 6:00 PM EDT
		const result = isVendorOpen([earlyCloseRow], [], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			expect(result.opensAt).toBeNull();
		}
	});

	it('returns isOpen=false with opensAt=null when no hours entry exists for today', () => {
		// Tuesday row only; evaluating on Monday
		const tuesdayRow: HoursRow = {
			dayOfWeek: 'tuesday',
			openTime: '07:00:00',
			closeTime: '18:00:00'
		};
		const at = new Date('2026-05-04T15:00:00Z'); // Monday
		const result = isVendorOpen([tuesdayRow], [], TZ, at);

		expect(result.isOpen).toBe(false);
		if (!result.isOpen) {
			expect(result.opensAt).toBeNull();
		}
	});

	it('returns isOpen=false when a closed exception exists for today', () => {
		// Regular hours say open; exception marks it closed
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
			expect(result.opensAt).toBeNull();
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
});
