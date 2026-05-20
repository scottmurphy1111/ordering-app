export function getReadableTextColor(hex: string): '#000000' | '#ffffff' {
	const clean = hex.replace('#', '');
	if (clean.length !== 6) return '#000000';

	const r = parseInt(clean.slice(0, 2), 16) / 255;
	const g = parseInt(clean.slice(2, 4), 16) / 255;
	const b = parseInt(clean.slice(4, 6), 16) / 255;

	const toLinear = (c: number) =>
		c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

	return luminance > 0.179 ? '#000000' : '#ffffff';
}

/**
 * Linearly mix two hex colors in sRGB space.
 * `ratio` is the weight of `a`: 0 → pure `b`, 1 → pure `a`.
 * Mirrors CSS `color-mix(in srgb, a ratio, b)` but resolved in JS so
 * the result can be baked into SVG data URIs that have no CSS context.
 * Returns `#rrggbb` lowercase. Falls back to `b` on malformed input.
 */
export function mixHex(a: string, b: string, ratio: number): string {
	const parse = (hex: string): [number, number, number] | null => {
		const t = hex.replace(/^#/, '').trim();
		const e = t.length === 3 ? t[0] + t[0] + t[1] + t[1] + t[2] + t[2] : t;
		if (e.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(e)) return null;
		return [parseInt(e.slice(0, 2), 16), parseInt(e.slice(2, 4), 16), parseInt(e.slice(4, 6), 16)];
	};
	const ra = parse(a);
	const rb = parse(b);
	if (!ra || !rb) return b.startsWith('#') ? b.toLowerCase() : `#${b.toLowerCase()}`;
	const t = Math.max(0, Math.min(1, ratio));
	const mix = (ca: number, cb: number) => Math.round(ca * t + cb * (1 - t));
	const [r1, g1, b1] = ra;
	const [r2, g2, b2] = rb;
	const out = (mix(r1, r2) << 16) | (mix(g1, g2) << 8) | mix(b1, b2);
	return `#${out.toString(16).padStart(6, '0')}`;
}
