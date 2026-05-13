// Pure utility — no DB imports. Pass already-fetched rows in.
// Mirrors the Intl offset-correction approach from pickup/expand.ts.

export interface HoursRow {
	dayOfWeek: string; // 'monday' | 'tuesday' | ... | 'sunday'
	openTime: string; // 'HH:MM:SS' (DB time column format)
	closeTime: string; // 'HH:MM:SS'
}

export interface ExceptionRow {
	date: string; // 'YYYY-MM-DD' (DB date column format)
	isClosed: boolean;
	openTime: string | null; // 'HH:MM:SS', null when isClosed=true
	closeTime: string | null; // 'HH:MM:SS', null when isClosed=true
}

export type OpenState = { isOpen: true; closesAt: Date } | { isOpen: false; opensAt: Date | null }; // opensAt null = no upcoming hours within 7 days

/**
 * Converts a wall-clock HH:MM time on a given YYYY-MM-DD calendar day to a UTC Date.
 * Replicates the offset-correction trick from pickup/expand.ts — no extra dependencies.
 */
function wallClockToUtc(dateStr: string, timeHHMM: string, ianaTimezone: string): Date {
	const [year, month, day] = dateStr.split('-').map(Number);
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

/**
 * Scans forward from fromDateStr + 1 day through 7 days, returning the first open moment found.
 * Called whenever today has no further shift — closed exception, no-hours day, past-all-shifts.
 */
function forwardScan(
	hours: HoursRow[],
	exceptions: ExceptionRow[],
	vendorTimezone: string,
	fromDateStr: string
): { isOpen: false; opensAt: Date | null } {
	const fromUtcMs = new Date(fromDateStr + 'T00:00:00Z').getTime();
	const ONE_DAY = 24 * 60 * 60 * 1000;

	for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
		const checkDate = new Date(fromUtcMs + dayOffset * ONE_DAY);
		const checkDateStr = checkDate.toISOString().slice(0, 10);

		// Check for a future exception on this date
		const futureException = exceptions.find((e) => e.date === checkDateStr);
		if (futureException) {
			if (futureException.isClosed) continue;
			if (futureException.openTime) {
				const openHHMM = futureException.openTime.substring(0, 5);
				const opensAt = wallClockToUtc(checkDateStr, openHHMM, vendorTimezone);
				return { isOpen: false, opensAt };
			}
		}

		// No exception — use regular weekly hours for that calendar day
		const weekday = new Intl.DateTimeFormat('en', {
			timeZone: 'UTC',
			weekday: 'long'
		})
			.format(checkDate)
			.toLowerCase();

		const dayRows = hours
			.filter((h) => h.dayOfWeek === weekday)
			.sort((a, b) => a.openTime.localeCompare(b.openTime));

		if (dayRows.length > 0) {
			const openHHMM = dayRows[0].openTime.substring(0, 5);
			const opensAt = wallClockToUtc(checkDateStr, openHHMM, vendorTimezone);
			return { isOpen: false, opensAt };
		}
	}

	// No open hours within the next 7 days
	return { isOpen: false, opensAt: null };
}

/**
 * Returns whether the vendor is currently open, when they close (if open),
 * or when they next open — today if a later shift exists, otherwise within 7 days.
 *
 * Pass DB-fetched rows directly — time columns arrive as 'HH:MM:SS' strings,
 * date columns as 'YYYY-MM-DD' strings.
 *
 * @param hours   Rows from vendor_hours for this vendor (all days).
 * @param exceptions  Rows from vendor_hours_exceptions for this vendor (all dates).
 * @param vendorTimezone  IANA timezone string, e.g. 'America/New_York'.
 * @param at  The moment to evaluate against. Defaults to now.
 */
export function isVendorOpen(
	hours: HoursRow[],
	exceptions: ExceptionRow[],
	vendorTimezone: string,
	at: Date = new Date()
): OpenState {
	// Resolve the local date string and weekday in vendor timezone
	const localDateStr = new Intl.DateTimeFormat('en-CA', {
		timeZone: vendorTimezone
	}).format(at); // 'YYYY-MM-DD'

	const localWeekday = new Intl.DateTimeFormat('en', {
		timeZone: vendorTimezone,
		weekday: 'long'
	})
		.format(at)
		.toLowerCase(); // 'monday', 'tuesday', ...

	// Check for an exception on today's date
	const exception = exceptions.find((e) => e.date === localDateStr);
	if (exception) {
		// Today is closed — scan forward for the next open day
		if (exception.isClosed) return forwardScan(hours, exceptions, vendorTimezone, localDateStr);

		// Exception provides custom hours — evaluate against those instead
		if (exception.openTime && exception.closeTime) {
			const openHHMM = exception.openTime.substring(0, 5);
			const closeHHMM = exception.closeTime.substring(0, 5);
			const opensAt = wallClockToUtc(localDateStr, openHHMM, vendorTimezone);
			const closesAt = wallClockToUtc(localDateStr, closeHHMM, vendorTimezone);

			if (at >= opensAt && at < closesAt) return { isOpen: true, closesAt };
			if (at < opensAt) return { isOpen: false, opensAt };
			// Past today's exception hours — scan forward
			return forwardScan(hours, exceptions, vendorTimezone, localDateStr);
		}
	}

	// Find all regular hours rows for today, sorted by open time
	const todayRows = hours
		.filter((h) => h.dayOfWeek === localWeekday)
		.sort((a, b) => a.openTime.localeCompare(b.openTime));

	// No hours configured for today — scan forward for the next open day
	if (todayRows.length === 0) return forwardScan(hours, exceptions, vendorTimezone, localDateStr);

	for (const row of todayRows) {
		const openHHMM = row.openTime.substring(0, 5);
		const closeHHMM = row.closeTime.substring(0, 5);
		const opensAt = wallClockToUtc(localDateStr, openHHMM, vendorTimezone);
		const closesAt = wallClockToUtc(localDateStr, closeHHMM, vendorTimezone);

		if (at >= opensAt && at < closesAt) return { isOpen: true, closesAt };
		// Haven't reached this shift yet — it's the next opening today
		if (at < opensAt) return { isOpen: false, opensAt };
		// Past this shift's close — continue to the next shift
	}

	// Past all of today's shifts — scan forward for the next open day
	return forwardScan(hours, exceptions, vendorTimezone, localDateStr);
}
