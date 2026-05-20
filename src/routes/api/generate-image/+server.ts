import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sharp from 'sharp';
import { generateImage, buildBannerPrompt, buildBackgroundPrompt } from '$lib/server/replicate';
import { uploadBufferToR2 } from '$lib/server/r2';

const MAX_PROMPT_LENGTH = 500;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.vendor) {
		throw error(401, 'Unauthorized');
	}

	const body = (await request.json()) as { type: 'banner' | 'background'; description: string };

	if (body.type !== 'banner' && body.type !== 'background') {
		throw error(400, 'Invalid generation type');
	}

	const description = (body.description ?? '').trim();
	if (description.length > MAX_PROMPT_LENGTH) {
		throw error(400, `Description must be ${MAX_PROMPT_LENGTH} characters or less`);
	}

	const fullPrompt =
		body.type === 'banner'
			? buildBannerPrompt(description, locals.vendor.name)
			: buildBackgroundPrompt(description, locals.vendor.name);

	let imageBuffer: Buffer;
	try {
		imageBuffer = await generateImage(fullPrompt, '21:9');
	} catch (err) {
		console.error('[generate-image] Replicate error:', err);
		throw error(500, 'Image generation failed. Please try again.');
	}

	if (body.type === 'banner') {
		imageBuffer = await sharp(imageBuffer)
			.resize(1600, 600, {
				fit: 'cover',
				position: 'center'
			})
			.webp({ quality: 90 })
			.toBuffer();
	}

	const prefix = `${body.type}-ai/${locals.vendor.id}`;
	const url = await uploadBufferToR2(imageBuffer, prefix, 'webp', 'image/webp');

	return json({ url });
};
