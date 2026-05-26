#!/usr/bin/env bun
// Generates the email-header PNG from the auth pattern source.
// Run via: bun run email:gen-pattern
// Output: static/email-assets/pattern-header.png (~1200×240 @ 2x retina)
import { authPattern } from '../src/lib/storefront/auth-pattern';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const OUTPUT_PATH = 'static/email-assets/pattern-header.png';

// Target: 1200×240 (2x retina for 600×120 email header).
// The auth pattern's natural tile is 353×202; we wrap it in an SVG canvas
// sized to 600×120 (1x), then sharp scales to 2x on rasterization.
const CANVAS_W = 600;
const CANVAS_H = 120;
const SCALE = 2;

async function main() {
	// auth-pattern.render returns the full <svg>...</svg> tile as a string.
	const innerSvg = authPattern.render('#ffffff');

	// Strip the outer <svg ...> wrapper so we can embed the inner content
	// inside a <pattern> definition.
	const inner = innerSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

	// Wrap as a tiling pattern on a green-filled canvas.
	const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
		<defs>
			<pattern id="p" x="0" y="0" width="353" height="202" patternUnits="userSpaceOnUse">
				<svg width="353" height="202" viewBox="0 0 353 202" fill="#ffffff" fill-opacity="0.18">${inner}</svg>
			</pattern>
		</defs>
		<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="#16a34a"/>
		<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#p)"/>
	</svg>`;

	await mkdir(dirname(OUTPUT_PATH), { recursive: true });

	const pngBuffer = await sharp(Buffer.from(wrappedSvg))
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
