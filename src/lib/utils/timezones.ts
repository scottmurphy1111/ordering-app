export type TimezoneOption = { value: string; label: string };

export const US_TIMEZONES: TimezoneOption[] = [
	{ value: 'America/New_York', label: 'Eastern Time — New York' },
	{ value: 'America/Chicago', label: 'Central Time — Chicago' },
	{ value: 'America/Denver', label: 'Mountain Time — Denver' },
	{ value: 'America/Phoenix', label: 'Mountain Time — Phoenix (no DST)' },
	{ value: 'America/Los_Angeles', label: 'Pacific Time — Los Angeles' },
	{ value: 'America/Anchorage', label: 'Alaska Time — Anchorage' },
	{ value: 'Pacific/Honolulu', label: 'Hawaii Time — Honolulu' }
];

// Fallback for environments where Intl.supportedValuesOf is unavailable (very rare)
const FALLBACK_TIMEZONES = [
	'America/New_York',
	'America/Chicago',
	'America/Denver',
	'America/Phoenix',
	'America/Los_Angeles',
	'America/Anchorage',
	'America/Adak',
	'Pacific/Honolulu',
	'America/Toronto',
	'America/Vancouver',
	'America/Mexico_City',
	'America/Sao_Paulo',
	'America/Buenos_Aires',
	'America/Bogota',
	'America/Lima',
	'America/Caracas',
	'Europe/London',
	'Europe/Dublin',
	'Europe/Paris',
	'Europe/Berlin',
	'Europe/Rome',
	'Europe/Madrid',
	'Europe/Amsterdam',
	'Europe/Stockholm',
	'Europe/Oslo',
	'Europe/Helsinki',
	'Europe/Warsaw',
	'Europe/Athens',
	'Europe/Istanbul',
	'Europe/Moscow',
	'Europe/Kyiv',
	'Africa/Cairo',
	'Africa/Nairobi',
	'Africa/Johannesburg',
	'Africa/Lagos',
	'Africa/Casablanca',
	'Asia/Dubai',
	'Asia/Kolkata',
	'Asia/Kathmandu',
	'Asia/Dhaka',
	'Asia/Bangkok',
	'Asia/Singapore',
	'Asia/Shanghai',
	'Asia/Tokyo',
	'Asia/Seoul',
	'Asia/Jakarta',
	'Asia/Hong_Kong',
	'Asia/Manila',
	'Asia/Karachi',
	'Asia/Tehran',
	'Asia/Baghdad',
	'Asia/Jerusalem',
	'Australia/Sydney',
	'Australia/Melbourne',
	'Australia/Brisbane',
	'Australia/Adelaide',
	'Australia/Perth',
	'Pacific/Auckland',
	'Pacific/Fiji',
	'Pacific/Guam'
];

/** Returns a human label for a timezone value. US zones get friendly names; others return the IANA string as-is. */
export function getTimezoneLabel(value: string): string {
	return US_TIMEZONES.find((tz) => tz.value === value)?.label ?? value;
}

/**
 * Returns the full IANA timezone list via Intl.supportedValuesOf where available,
 * falling back to a curated list otherwise.
 */
export function getAllTimezones(): string[] {
	if (
		typeof Intl !== 'undefined' &&
		typeof (Intl as Record<string, unknown>).supportedValuesOf === 'function'
	) {
		return (Intl as { supportedValuesOf(key: string): string[] }).supportedValuesOf('timeZone');
	}
	return FALLBACK_TIMEZONES;
}
