/**
 * Font pairings available to vendors for their storefront. Each pair specifies
 * a heading font (for vendor name, category headings) and a body font (for
 * descriptions, prices, UI text).
 *
 * The Google Fonts URL is built at layout time from the active pair so we only
 * load fonts the storefront actually uses.
 */
export type FontPairSlug =
	| 'fraunces-dm-sans'
	| 'playfair-inter'
	| 'libre-baskerville-source-sans'
	| 'archivo-archivo'
	| 'space-grotesk-space-grotesk'
	| 'lora-nunito-sans';

export interface FontPair {
	slug: FontPairSlug;
	label: string;
	description: string;
	heading: { family: string; cssStack: string; weights: string };
	body: { family: string; cssStack: string; weights: string };
	/** Sample text rendered in the picker preview */
	previewHeading: string;
	previewBody: string;
}

export const FONT_PAIRS: Record<FontPairSlug, FontPair> = {
	'fraunces-dm-sans': {
		slug: 'fraunces-dm-sans',
		label: 'Editorial Serif',
		description: 'Warm and confident. Good for bakeries, cafes, established brands.',
		heading: {
			family: 'Fraunces',
			cssStack: "'Fraunces', Georgia, serif",
			weights: 'ital,opsz,wght@0,9..144,300..900;1,9..144,300..900'
		},
		body: {
			family: 'DM Sans',
			cssStack: "'DM Sans', system-ui, sans-serif",
			weights: 'ital,opsz,wght@0,9..40,300..700;1,9..40,300..700'
		},
		previewHeading: 'Sweet Crumb Bakery',
		previewBody: 'Sourdough loaves, pastries, and seasonal specials.'
	},
	'playfair-inter': {
		slug: 'playfair-inter',
		label: 'Refined Modern',
		description: 'High-contrast serif headlines on clean body text. Florists, fine foods.',
		heading: {
			family: 'Playfair Display',
			cssStack: "'Playfair Display', Georgia, serif",
			weights: 'ital,wght@0,400..900;1,400..900'
		},
		body: {
			family: 'Inter',
			cssStack: "'Inter', system-ui, sans-serif",
			weights: 'wght@300..700'
		},
		previewHeading: 'Sweet Crumb Bakery',
		previewBody: 'Sourdough loaves, pastries, and seasonal specials.'
	},
	'libre-baskerville-source-sans': {
		slug: 'libre-baskerville-source-sans',
		label: 'Classic Print',
		description:
			'Newspaper-feel serif with grounded sans. Farmers markets, butchers, traditional crafts.',
		heading: {
			family: 'Libre Baskerville',
			cssStack: "'Libre Baskerville', Georgia, serif",
			weights: 'ital,wght@0,400;0,700;1,400'
		},
		body: {
			family: 'Source Sans 3',
			cssStack: "'Source Sans 3', system-ui, sans-serif",
			weights: 'ital,wght@0,300..700;1,300..700'
		},
		previewHeading: 'Sweet Crumb Bakery',
		previewBody: 'Sourdough loaves, pastries, and seasonal specials.'
	},
	'archivo-archivo': {
		slug: 'archivo-archivo',
		label: 'Sharp Sans',
		description:
			'Single-family sans with bold contrast. Modern cafes, tech-adjacent food, breweries.',
		heading: {
			family: 'Archivo',
			cssStack: "'Archivo', system-ui, sans-serif",
			weights: 'wdth,wght@62.5..125,100..900'
		},
		body: {
			family: 'Archivo',
			cssStack: "'Archivo', system-ui, sans-serif",
			weights: 'wdth,wght@62.5..125,100..900'
		},
		previewHeading: 'Sweet Crumb Bakery',
		previewBody: 'Sourdough loaves, pastries, and seasonal specials.'
	},
	'space-grotesk-space-grotesk': {
		slug: 'space-grotesk-space-grotesk',
		label: 'Geometric',
		description:
			'Geometric sans with personality. Specialty coffee, modern bakeries, designed-forward brands.',
		heading: {
			family: 'Space Grotesk',
			cssStack: "'Space Grotesk', system-ui, sans-serif",
			weights: 'wght@300..700'
		},
		body: {
			family: 'Space Grotesk',
			cssStack: "'Space Grotesk', system-ui, sans-serif",
			weights: 'wght@300..700'
		},
		previewHeading: 'Sweet Crumb Bakery',
		previewBody: 'Sourdough loaves, pastries, and seasonal specials.'
	},
	'lora-nunito-sans': {
		slug: 'lora-nunito-sans',
		label: 'Soft Serif',
		description:
			'Friendly serif with rounded sans body. Florists, candle makers, soaps, gift-y goods.',
		heading: {
			family: 'Lora',
			cssStack: "'Lora', Georgia, serif",
			weights: 'ital,wght@0,400..700;1,400..700'
		},
		body: {
			family: 'Nunito Sans',
			cssStack: "'Nunito Sans', system-ui, sans-serif",
			weights: 'ital,opsz,wght@0,6..12,300..900;1,6..12,300..900'
		},
		previewHeading: 'Sweet Crumb Bakery',
		previewBody: 'Sourdough loaves, pastries, and seasonal specials.'
	}
};

/**
 * Build a Google Fonts URL for the given pair, requesting both heading and body
 * families. When the pair uses the same family for both, only one family is
 * requested.
 */
export function googleFontsUrl(pair: FontPair): string {
	const families = new Map<string, string>();
	families.set(pair.heading.family, pair.heading.weights);
	if (pair.body.family !== pair.heading.family) {
		families.set(pair.body.family, pair.body.weights);
	}
	const params = Array.from(families.entries())
		.map(([family, weights]) => {
			const encodedFamily = family.replace(/ /g, '+');
			return `family=${encodedFamily}:${weights}`;
		})
		.join('&');
	return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export function resolveFontPair(slug: string | null | undefined): FontPair {
	if (slug && slug in FONT_PAIRS) {
		return FONT_PAIRS[slug as FontPairSlug];
	}
	return FONT_PAIRS['fraunces-dm-sans'];
}
