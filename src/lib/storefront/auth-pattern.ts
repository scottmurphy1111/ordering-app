/**
 * Order Local auth-page brand pattern.
 *
 * Renders a 240×240 SVG tile with six scattered filled food-themed
 * silhouettes. Consumed by the auth layout's right panel as a tiled
 * background.
 *
 * Distinct from the vendor-configurable patterns in
 * `background-patterns.ts` — this one is not pickable by vendors;
 * it's an Order Local brand decoration specific to the auth pages.
 *
 * Icons used (mdi, all 24×24 viewBox):
 *   - bread
 *   - cupcake
 *   - wheat
 *   - basket
 *   - plant
 *   - coffee
 *
 * Each icon's path data is inlined verbatim from Iconify's mdi set,
 * then scaled and positioned within the 240×240 tile via SVG
 * transforms.
 */

export type AuthPattern = {
	tileSize: string;
	render: (color: string) => string;
};

export const PATHS = {
	bread:
		'M5 22c-1.32 0-1.85-2.36-1.96-3.3a5.56 5.56 0 0 1 .32-2.7a2.5 2.5 0 0 1 1.87-1.62c1.17-.2 2 .5 3.06.74a1.21 1.21 0 0 0 1.56-1.37C9.41 12.03 6.28 12 5 12c0-1.86 2.04-2.1 3.5-1.96a10.8 10.8 0 0 1 2.54.56c.5.17 1.08.6 1.63.56c.83-.07 1-.93.64-1.56C12.44 8.12 9.97 8 8.5 8c0-2 1.73-2.38 3.39-2.08a11.6 11.6 0 0 1 2.49.79c.51.22 1.12.64 1.68.45c1.44-.44-.06-1.98-.7-2.35a6.6 6.6 0 0 0-1.42-.58c-.54-.16-1.2-.1-.71-.73a5.13 5.13 0 0 1 2.73-1.24c1.89-.44 4.5-.52 4.96 1.86a5.3 5.3 0 0 1-.85 3.58a39 39 0 0 1-6.85 8.63a36.6 36.6 0 0 1-4.6 3.99C7.62 21.04 6.3 22 5 22',
	cupcake:
		'M12 1.5A2.5 2.5 0 0 1 14.5 4A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 9.5 4A2.5 2.5 0 0 1 12 1.5M15.87 5C18 5 20 7 20 9c2.7 0 2.7 4 0 4H4c-2.7 0-2.7-4 0-4c0-2 2-4 4.13-4c.44 1.73 2.01 3 3.87 3s3.43-1.27 3.87-3M5 15h3l1 7H7zm5 0h4l-1 7h-2zm6 0h3l-2 7h-2z',
	wheat:
		'M7.33 18.33c-.83-1.16-.83-2.5-.83-3.83c1.67 1 3.33 2 4.17 3.17l.33.56v-2.28c-1.5-.9-2.92-1.82-3.67-2.87c-.83-1.16-.83-2.5-.83-3.83c1.67 1 3.33 2 4.17 3.17L11 13v-2.3c-1.5-.9-2.92-1.82-3.67-2.87C6.5 6.67 6.5 5.33 6.5 4c1.67 1 3.33 2 4.17 3.17q.15.21.27.45c-.17-.62-.28-1.2-.29-1.8c-.01-1.51.65-3.06 1.31-4.61c.69 1.48 1.38 2.97 1.39 4.48c.01.63-.1 1.27-.28 1.9c.08-.14.16-.28.26-.42C14.17 6 15.83 5 17.5 4c0 1.33 0 2.67-.83 3.83C15.92 8.88 14.5 9.8 13 10.7V13l.33-.58c.84-1.17 2.5-2.17 4.17-3.17c0 1.33 0 2.67-.83 3.83c-.75 1.05-2.17 1.97-3.67 2.87v2.28l.33-.56c.84-1.17 2.5-2.17 4.17-3.17c0 1.33 0 2.67-.83 3.83c-.75 1.05-2.17 1.97-3.67 2.87V23h-2v-1.8c-1.5-.9-2.92-1.82-3.67-2.87',
	basket:
		'M5.5 21c-.78 0-1.46-.45-1.79-1.1L1.1 10.44L1 10a1 1 0 0 1 1-1h4.58l4.6-6.57a.997.997 0 0 1 1.65.01L17.42 9H22a1 1 0 0 1 1 1l-.04.29l-2.67 9.61c-.33.65-1.01 1.1-1.79 1.1zM12 4.74L9 9h6zM12 13a2 2 0 0 0-2 2a2 2 0 0 0 2 2a2 2 0 0 0 2-2a2 2 0 0 0-2-2',
	plant:
		'M3 13a9 9 0 0 0 9 9c0-5-4.03-9-9-9m9-7.5A2.5 2.5 0 0 1 14.5 8a2.5 2.5 0 0 1-2.5 2.5A2.5 2.5 0 0 1 9.5 8A2.5 2.5 0 0 1 12 5.5m-6.4 4.75a2.5 2.5 0 0 0 2.5 2.5c.53 0 1.02-.17 1.4-.44v.19A2.5 2.5 0 0 0 12 15a2.5 2.5 0 0 0 2.5-2.5v-.19c.38.27.87.44 1.4.44a2.5 2.5 0 0 0 2.5-2.5c0-1-.59-1.85-1.43-2.25c.84-.4 1.43-1.26 1.43-2.25a2.5 2.5 0 0 0-2.5-2.5c-.53 0-1.02.16-1.4.44V3.5A2.5 2.5 0 0 0 12 1a2.5 2.5 0 0 0-2.5 2.5v.19c-.38-.28-.87-.44-1.4-.44a2.5 2.5 0 0 0-2.5 2.5c0 .99.59 1.85 1.43 2.25c-.84.4-1.43 1.25-1.43 2.25M12 22a9 9 0 0 0 9-9c-5 0-9 4-9 9',
	coffee:
		'M2 21h18v-2H2M20 8h-2V5h2m0-2H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2'
};

function render(color: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 353 202" fill="${color}" fill-opacity="0.18"><g transform="translate(20, 30) scale(2.5) rotate(-10)"><path d="${PATHS.wheat}"/></g><g transform="translate(158, 38) scale(1.9) rotate(8)"><path d="${PATHS.bread}"/></g><g transform="translate(268, 28) scale(2.5) rotate(-5)"><path d="${PATHS.cupcake}"/></g><g transform="translate(88, 130) scale(1.7) rotate(12)"><path d="${PATHS.basket}"/></g><g transform="translate(190, 135) scale(2.1) rotate(-15)"><path d="${PATHS.plant}"/></g><g transform="translate(310, 130) scale(1.8) rotate(5)"><path d="${PATHS.coffee}"/></g></svg>`;
}

export const authPattern: AuthPattern = {
	tileSize: '353px 202px',
	render
};
