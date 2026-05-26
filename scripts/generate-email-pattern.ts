#!/usr/bin/env bun
// Generates the email-header PNG using a hand-authored layout tuned for the
// email header's 5:1 aspect ratio. Run via: bun run email:gen-pattern
// Output: static/email-assets/pattern-header.png (1200×240 @ 2x retina)
import { PATHS } from '../src/lib/storefront/auth-pattern';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const OUTPUT_PATH = 'static/email-assets/pattern-header.png';

// Target: 1200×240 (2x retina for 600×120 email header).
const CANVAS_W = 600;
const CANVAS_H = 120;
const SCALE = 2;
const GREEN = '#16a34a';

// Hand-tuned layout for the email header's 5:1 aspect ratio.
// All 6 icon types are represented; some appear twice (intentional —
// repetition is what makes a pattern feel like wallpaper, not a chart).
// Big anchors (scale 2.0–2.2) on the "top row" (y: 6–12),
// mediums (scale 1.4–1.6) on the "bottom row" (y: 55–62).
// Rotation range -15° to +22° gives more variety than the auth tile.
type IconPlacement = {
	name: keyof typeof PATHS;
	x: number;
	y: number;
	scale: number;
	rotation: number;
};

const PLACEMENTS: IconPlacement[] = [
	{ name: 'bread', x: 15, y: 8, scale: 2.1, rotation: -8 },
	{ name: 'plant', x: 85, y: 58, scale: 1.5, rotation: 18 },
	{ name: 'wheat', x: 160, y: 12, scale: 2.2, rotation: -12 },
	{ name: 'basket', x: 228, y: 60, scale: 1.6, rotation: 15 },
	{ name: 'bread', x: 298, y: 6, scale: 2.0, rotation: -8 },
	{ name: 'plant', x: 362, y: 62, scale: 1.4, rotation: 22 },
	{ name: 'cupcake', x: 428, y: 10, scale: 2.1, rotation: -5 },
	{ name: 'coffee', x: 500, y: 55, scale: 1.4, rotation: 10 },
	{ name: 'wheat', x: 555, y: 8, scale: 1.6, rotation: -15 }
];

function renderIcon(p: IconPlacement): string {
	const path = PATHS[p.name];
	return `<g transform="translate(${p.x}, ${p.y}) scale(${p.scale}) rotate(${p.rotation})"><path d="${path}"/></g>`;
}

async function main() {
	const icons = PLACEMENTS.map(renderIcon).join('');

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
		<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${GREEN}"/>
		<g fill="#ffffff" fill-opacity="0.18">${icons}</g>
	</svg>`;

	await mkdir(dirname(OUTPUT_PATH), { recursive: true });

	const pngBuffer = await sharp(Buffer.from(svg))
		.resize(CANVAS_W * SCALE, CANVAS_H * SCALE)
		.png({ compressionLevel: 9 })
		.toBuffer();

	await writeFile(OUTPUT_PATH, pngBuffer);

	console.log(`✓ Wrote ${OUTPUT_PATH} (${pngBuffer.length} bytes)`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
