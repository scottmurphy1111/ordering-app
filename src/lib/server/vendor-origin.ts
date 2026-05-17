import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

/**
 * Build the public-facing origin (scheme + host) for a vendor's storefront.
 *
 * Production:  https://{slug}.getorderlocal.com  (apex is ORIGIN env var)
 * Dev (Chrome resolves *.localhost natively):  http://{slug}.localhost:5173
 *
 * Use this for any URL that crosses host boundaries:
 *   - Dashboard surfaces showing the vendor's public catalog link / QR code
 *   - Stripe success/cancel URLs in checkout sessions
 *   - Email links pointing customers to their storefront
 *
 * For links INSIDE a vendor's storefront (e.g. catalog → cart), use plain
 * relative paths: the storefront is already on the vendor's own host.
 */
export function vendorOrigin(slug: string): string {
	if (dev) {
		const port = env.PORT ?? '5173';
		return `http://${slug}.localhost:${port}`;
	}
	// Production: ORIGIN is the apex (getorderlocal.com); vendor subdomains sit directly under it.
	const origin = env.ORIGIN ?? 'https://getorderlocal.com';
	const url = new URL(origin);
	return `${url.protocol}//${slug}.${url.hostname}${url.port ? ':' + url.port : ''}`;
}

/**
 * Same as vendorOrigin but builds a full URL with a path appended.
 * Path should start with '/' (e.g. '/catalog', '/orders/123').
 */
export function vendorUrl(slug: string, path: string): string {
	const normalizedPath = path.startsWith('/') ? path : '/' + path;
	return vendorOrigin(slug) + normalizedPath;
}
