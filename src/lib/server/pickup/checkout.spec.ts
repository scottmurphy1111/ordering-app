import { describe, it, expect } from 'vitest';
import { validateStorefrontPickup, STOREFRONT_VALIDATION_REASON } from './storefrontValidation';
import type { HoursRow, ExceptionRow } from '../../hours/isOpen';

// All tests use America/New_York in EDT (UTC-4, May 2026).
// 2026-05-04 = Monday. Bakery hours: 7am–6pm Mon–Fri.
const TZ = 'America/New_York';

const monFri: HoursRow = { dayOfWeek: 'monday', openTime: '07:00:00', closeTime: '18:00:00' };
const noExceptions: ExceptionRow[] = [];

describe('validateStorefrontPickup', () => {
	it('ASAP: returns valid when vendor is currently open', () => {
		// 11:00 AM EDT (15:00 UTC) on Monday — within 7am–6pm
		const now = new Date('2026-05-04T15:00:00Z');
		const result = validateStorefrontPickup(null, [monFri], noExceptions, TZ, now);
		expect(result.valid).toBe(true);
	});

	it('ASAP: returns invalid with vendor_closed when vendor is currently closed', () => {
		// 8:00 PM EDT (00:00 UTC next day) on Monday — past 6pm close
		const now = new Date('2026-05-05T00:00:00Z');
		const result = validateStorefrontPickup(null, [monFri], noExceptions, TZ, now);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe(STOREFRONT_VALIDATION_REASON.vendorClosed);
		}
	});

	it('Scheduled: returns invalid with outside_hours when scheduledFor is in the past', () => {
		const now = new Date('2026-05-04T15:00:00Z');
		const past = new Date('2026-05-04T14:00:00Z'); // 1 hour before now
		const result = validateStorefrontPickup(past, [monFri], noExceptions, TZ, now);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe(STOREFRONT_VALIDATION_REASON.outsideHours);
		}
	});

	it('Scheduled: returns valid when scheduledFor falls within a future open window', () => {
		// now = 8:00 AM EDT, scheduledFor = 2:00 PM EDT same day — both within 7am–6pm
		const now = new Date('2026-05-04T12:00:00Z'); // 8am EDT
		const scheduledFor = new Date('2026-05-04T18:00:00Z'); // 2pm EDT
		const result = validateStorefrontPickup(scheduledFor, [monFri], noExceptions, TZ, now);
		expect(result.valid).toBe(true);
	});

	it('Scheduled: returns invalid when scheduledFor is on an exception-closed date', () => {
		const exception: ExceptionRow = {
			date: '2026-05-04',
			isClosed: true,
			openTime: null,
			closeTime: null
		};
		const now = new Date('2026-05-04T12:00:00Z'); // 8am EDT
		const scheduledFor = new Date('2026-05-04T15:00:00Z'); // 11am EDT — normally open
		const result = validateStorefrontPickup(scheduledFor, [monFri], [exception], TZ, now);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe(STOREFRONT_VALIDATION_REASON.outsideHours);
		}
	});

	it('Scheduled: returns valid when scheduledFor matches exception custom hours', () => {
		// Regular hours: 7am–2pm. Exception opens 10am–8pm. Schedule at 6pm (in exception window).
		const earlyClose: HoursRow = {
			dayOfWeek: 'monday',
			openTime: '07:00:00',
			closeTime: '14:00:00'
		};
		const exception: ExceptionRow = {
			date: '2026-05-04',
			isClosed: false,
			openTime: '10:00:00',
			closeTime: '20:00:00'
		};
		const now = new Date('2026-05-04T12:00:00Z'); // 8am EDT
		const scheduledFor = new Date('2026-05-04T22:00:00Z'); // 6pm EDT — past regular close, in exception
		const result = validateStorefrontPickup(scheduledFor, [earlyClose], [exception], TZ, now);
		expect(result.valid).toBe(true);
	});

	it('Scheduled: returns invalid when scheduledFor is outside the day window (3am, hours 7am–6pm)', () => {
		// now = 1am Monday EDT, scheduledFor = 3am Monday EDT — vendor closed at 3am
		const now = new Date('2026-05-04T05:00:00Z'); // 1am EDT
		const scheduledFor = new Date('2026-05-04T07:00:00Z'); // 3am EDT
		const result = validateStorefrontPickup(scheduledFor, [monFri], noExceptions, TZ, now);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe(STOREFRONT_VALIDATION_REASON.outsideHours);
		}
	});
});
