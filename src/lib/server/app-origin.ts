import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

/**
 * Build the origin (scheme + host) for the vendor dashboard app host.
 *
 * Production:  https://app.getorderlocal.com  (APP_ORIGIN env var)
 * Dev:         http://localhost:5173  (APP_ORIGIN env var, or derived from PORT)
 *
 * Use this for server-side cross-host redirects and absolute URLs that must
 * land on the dashboard host — e.g. post-auth redirects from the apex, and
 * post-invite-accept redirects to /vendors.
 */
export function appOrigin(): string {
	if (dev) {
		return env.APP_ORIGIN ?? `http://localhost:${env.PORT ?? '5173'}`;
	}
	return env.APP_ORIGIN ?? 'https://app.getorderlocal.com';
}

/**
 * Same as appOrigin but builds a full URL with a path appended.
 * Path should start with '/' (e.g. '/vendors', '/dashboard/orders').
 */
export function appUrl(path: string): string {
	const normalizedPath = path.startsWith('/') ? path : '/' + path;
	return appOrigin() + normalizedPath;
}
