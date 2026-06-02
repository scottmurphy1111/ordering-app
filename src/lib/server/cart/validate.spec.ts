import { describe, it, expect } from 'vitest';
import { isCompatible } from './compat';

describe('isCompatible — availability mode vs pickup mode', () => {
	it('always is compatible with pickup_event', () => {
		expect(isCompatible('always', 'pickup_event')).toBe(true);
	});

	it('always is compatible with storefront_hours', () => {
		expect(isCompatible('always', 'storefront_hours')).toBe(true);
	});

	it('storefront_only is incompatible with pickup_event', () => {
		expect(isCompatible('storefront_only', 'pickup_event')).toBe(false);
	});

	it('storefront_only is compatible with storefront_hours', () => {
		expect(isCompatible('storefront_only', 'storefront_hours')).toBe(true);
	});

	it('events_only is incompatible with storefront_hours', () => {
		expect(isCompatible('events_only', 'storefront_hours')).toBe(false);
	});

	it('events_only is compatible with pickup_event', () => {
		expect(isCompatible('events_only', 'pickup_event')).toBe(true);
	});

	it('unlisted is compatible with any mode (hidden from catalog, link-orderable)', () => {
		expect(isCompatible('unlisted', 'pickup_event')).toBe(true);
		expect(isCompatible('unlisted', 'storefront_hours')).toBe(true);
	});

	it('any mode is compatible when pickupMode is undefined', () => {
		expect(isCompatible('storefront_only', undefined)).toBe(true);
		expect(isCompatible('events_only', undefined)).toBe(true);
	});
});
