import { isVendorOpen, type HoursRow, type ExceptionRow } from '../../hours/isOpen';

export const STOREFRONT_VALIDATION_REASON = {
	vendorClosed: 'vendor_closed',
	outsideHours: 'outside_operating_hours'
} as const;

export type StorefrontValidationResult = { valid: true } | { valid: false; reason: string };

/**
 * Validates a storefront-mode pickup order against the vendor's operating hours.
 *
 * ASAP (scheduledFor === null): vendor must be currently open.
 * Scheduled (scheduledFor !== null): the scheduled moment must fall within an open window.
 *
 * The caller passes already-fetched hours and exceptions rows — no DB access here.
 */
export function validateStorefrontPickup(
	scheduledFor: Date | null,
	hours: HoursRow[],
	exceptions: ExceptionRow[],
	vendorTimezone: string,
	now: Date = new Date()
): StorefrontValidationResult {
	if (scheduledFor === null) {
		const state = isVendorOpen(hours, exceptions, vendorTimezone, now);
		if (!state.isOpen) {
			return { valid: false, reason: STOREFRONT_VALIDATION_REASON.vendorClosed };
		}
		return { valid: true };
	}

	if (scheduledFor < now) {
		return { valid: false, reason: STOREFRONT_VALIDATION_REASON.outsideHours };
	}
	const state = isVendorOpen(hours, exceptions, vendorTimezone, scheduledFor);
	if (!state.isOpen) {
		return { valid: false, reason: STOREFRONT_VALIDATION_REASON.outsideHours };
	}
	return { valid: true };
}
