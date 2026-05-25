/**
 * Resolve an analytics date range from URL search params.
 *
 * Priority: custom `from`/`to` (both must be valid `YYYY-MM-DD` and from <= to)
 * falls back to `range=7|30|90` preset (default 30 days).
 *
 * `endOfRange` is end-of-day on `to` for custom ranges, or `now` for presets,
 * so both bounds are inclusive at the day boundary.
 */
export function resolveRange(searchParams: URLSearchParams): {
	startOfRange: Date;
	endOfRange: Date;
	rangeDays: number;
} {
	const fromParam = searchParams.get('from');
	const toParam = searchParams.get('to');
	const rangeStr = searchParams.get('range');
	const now = new Date();
	const isValid = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

	if (isValid(fromParam) && isValid(toParam) && fromParam <= toParam) {
		const startOfRange = new Date(`${fromParam}T00:00:00.000Z`);
		const endOfRange = new Date(`${toParam}T23:59:59.999Z`);
		const rangeDays = Math.max(
			1,
			Math.round((endOfRange.getTime() - startOfRange.getTime()) / (24 * 60 * 60 * 1000))
		);
		return { startOfRange, endOfRange, rangeDays };
	}

	const days = rangeStr === '7' ? 7 : rangeStr === '90' ? 90 : 30;
	return {
		startOfRange: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
		endOfRange: now,
		rangeDays: days
	};
}
