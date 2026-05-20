import Replicate from 'replicate';
import { env } from '$env/dynamic/private';

/**
 * Generates an image using Flux-schnell on Replicate.
 *
 * Returns a Buffer of the generated image bytes (WebP). Caller is responsible
 * for uploading to R2 and storing the URL.
 *
 * Throws on API failure. Caller should wrap in try/catch and surface a friendly error.
 *
 * Flux-schnell is fast (~2-4s end-to-end) and inexpensive (~$0.003/generation).
 * Output quality is good for stylized hero imagery — banners, backgrounds, decorative scenes.
 * Not suitable for logos, text-heavy images, or photorealistic portraits.
 */
export async function generateImage(prompt: string, aspectRatio: '16:9' | '21:9'): Promise<Buffer> {
	if (!env.REPLICATE_API_TOKEN) {
		throw new Error('REPLICATE_API_TOKEN is not configured');
	}

	const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN });

	const output = await replicate.run('black-forest-labs/flux-schnell', {
		input: {
			prompt,
			num_inference_steps: 4,
			aspect_ratio: aspectRatio,
			output_format: 'webp',
			output_quality: 90,
			go_fast: true,
			megapixels: '1'
		}
	});

	// Replicate returns an array of ReadableStreams (one per generated image).
	// We requested 1 image (default), so output[0] is our stream.
	const stream = Array.isArray(output) ? output[0] : output;

	if (!stream || typeof stream !== 'object' || !('getReader' in stream)) {
		throw new Error('Unexpected Replicate output format');
	}

	return await streamToBuffer(stream as ReadableStream<Uint8Array>);
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value) chunks.push(value);
	}

	const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
	const merged = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.length;
	}
	return Buffer.from(merged);
}

/**
 * Builds a Flux-schnell prompt for a banner image.
 *
 * Generated at 21:9; the endpoint crops+resizes to exactly 1600×600.
 * The template prefix sets quality constraints (no text, photographic, cinematic)
 * and the vendor's free-text fills in the subject matter. Empty input falls back to
 * a generic phrase using the vendor name.
 */
export function buildBannerPrompt(vendorInput: string, vendorName: string): string {
	const cleanInput = vendorInput.trim();
	const subject = cleanInput || `a small artisanal food business called ${vendorName}`;

	return [
		`Hero banner photograph for ${subject}.`,
		'Wide cinematic composition, professional product photography style.',
		'Warm natural lighting, soft focus background, shallow depth of field.',
		'No text, no watermarks, no logos.',
		'21:9 ultra-wide aspect ratio.'
	].join(' ');
}

/**
 * Builds a Flux-schnell prompt for a storefront background image.
 * Background images are decorative — they sit behind content and should not compete.
 */
export function buildBackgroundPrompt(vendorInput: string, vendorName: string): string {
	const cleanInput = vendorInput.trim();
	const subject = cleanInput || `a small artisanal food business called ${vendorName}`;

	return [
		`Decorative background photograph related to ${subject}.`,
		'Soft, muted tones. Blurred or shallow-depth composition.',
		'Out of focus, low contrast — designed to sit behind content without distracting.',
		'No text, no watermarks, no logos, no people, no faces.',
		'Wide aspect ratio, atmospheric.'
	].join(' ');
}
