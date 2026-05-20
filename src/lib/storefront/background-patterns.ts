import { mixHex } from './contrast';

/**
 * Curated tileable background patterns. Each pattern is rendered as inline
 * SVG colored with the vendor's foreground color, so patterns automatically
 * track brand colors as the vendor changes them.
 *
 * The SVG markup is emitted via `render(color)` and consumed two places:
 *   1. The branding page preview swatches (the vendor's chosen color).
 *   2. The storefront layout (same color, applied at runtime).
 *
 * `tileSize` is the CSS `background-size` value used when tiling. It is
 * fixed per pattern — sizing is intrinsic to how each motif reads.
 *
 * Each SVG's viewBox is the tile unit. Motifs are designed to wrap
 * seamlessly at the viewBox edges so `background-repeat: repeat` produces
 * a continuous pattern.
 */
export type BackgroundPattern = {
	slug: string;
	label: string;
	/** CSS background-size value, e.g. '40px' or '40px 20px'. */
	tileSize: string;
	/** Render the SVG markup with the given stroke/fill color. */
	render: (color: string) => string;
};

/**
 * Build a data URI from an SVG string. Used by both the storefront layout
 * and the branding page preview swatches.
 *
 * Quoting layers (each must be distinct to avoid collisions in the inline
 * `style="..."` attribute that ultimately wraps this):
 *   - HTML attribute: double quotes (Svelte default)
 *   - CSS url() wrapper: single quotes
 *   - SVG attributes: double quotes (encoded to %22 by encodeURIComponent)
 *
 * encodeURIComponent encodes `#` (the leading hex-color char) to `%23` and
 * `"` to `%22`, but leaves `'` untouched — so the SVG attributes must be
 * double-quoted, otherwise an inner `'` would terminate the url() wrapper.
 */
export function patternDataUri(pattern: BackgroundPattern, color: string): string {
	const svg = pattern.render(color);
	return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}')`;
}

export const BACKGROUND_PATTERNS: BackgroundPattern[] = [
	{
		slug: 'subtle-dots',
		label: 'Subtle dots',
		tileSize: '40px',
		render: (c) =>
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="1.5" fill="${c}" fill-opacity="0.30"/></svg>`
	},
	{
		slug: 'dense-dots',
		label: 'Dense dots',
		tileSize: '20px',
		render: (c) =>
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="1" fill="${c}" fill-opacity="0.32"/></svg>`
	},
	{
		slug: 'fine-grid',
		label: 'Fine grid',
		tileSize: '24px',
		render: (c) =>
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M24 0 H0 V24" fill="none" stroke="${c}" stroke-opacity="0.18" stroke-width="1"/></svg>`
	},
	{
		slug: 'diagonal-lines',
		label: 'Diagonal lines',
		tileSize: '14px',
		render: (c) =>
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14"><path d="M-1 1 L1 -1 M0 14 L14 0 M13 15 L15 13" fill="none" stroke="${c}" stroke-opacity="0.20" stroke-width="1"/></svg>`
	},
	{
		slug: 'cross-hatch',
		label: 'Cross hatch',
		tileSize: '20px',
		render: (c) =>
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M-1 1 L1 -1 M0 20 L20 0 M19 21 L21 19 M-1 19 L1 21 M0 0 L20 20 M19 -1 L21 1" fill="none" stroke="${c}" stroke-opacity="0.16" stroke-width="1"/></svg>`
	},
	{
		slug: 'tiny-chevrons',
		label: 'Tiny chevrons',
		tileSize: '28px',
		render: (c) =>
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 14"><path d="M0 14 L7 7 L14 14 L21 7 L28 14" fill="none" stroke="${c}" stroke-opacity="0.22" stroke-width="1.2"/></svg>`
	},
	{
		slug: 'plus-signs',
		label: 'Plus signs',
		tileSize: '32px',
		render: (c) =>
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M14 8 H18 V14 H24 V18 H18 V24 H14 V18 H8 V14 H14 Z" fill="${c}" fill-opacity="0.18"/></svg>`
	},
	{
		slug: 'diagonal-stripes',
		label: 'Diagonal stripes',
		tileSize: '40px',
		render: (c) =>
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M-2 2 L2 -2 M0 40 L40 0 M38 42 L42 38" fill="none" stroke="${c}" stroke-opacity="0.16" stroke-width="4"/></svg>`
	}
];

/**
 * Build a data URI using a *tinted* color: `foreground` mixed partway into
 * `background` in sRGB space. Reads as "the surface has a texture" rather
 * than "bright specks on the surface." The pattern's existing opacity values
 * still apply on top of the already-desaturated tone.
 *
 * `mixRatio` defaults to 0.5 (half-way between foreground and background).
 * Higher → closer to the full foreground color; lower → more subtle.
 */
export function patternDataUriSoft(
	pattern: BackgroundPattern,
	foreground: string,
	background: string,
	mixRatio = 0.5
): string {
	const tinted = mixHex(foreground, background, mixRatio);
	const svg = pattern.render(tinted);
	return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}')`;
}

/** Lookup helper. Returns null for unknown slugs (and for null/undefined input). */
export function findPatternBySlug(slug: string | null | undefined): BackgroundPattern | null {
	if (!slug) return null;
	return BACKGROUND_PATTERNS.find((p) => p.slug === slug) ?? null;
}
