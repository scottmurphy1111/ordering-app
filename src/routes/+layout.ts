import { dev } from '$app/environment';
import { injectAnalytics } from '@vercel/analytics/sveltekit';

// Marketing-site pages only. Vercel Web Analytics otherwise counts every route
// — authed /dashboard and /admin, plus every vendor storefront — which dilutes
// "site visitor" numbers and burns the Hobby-plan monthly event quota.
// Storefront analytics is a deliberately deferred enhancement (Advanced
// Analytics add-on), not part of this metric.
const TRACKED_PATHS = new Set(['/', '/for-bakers', '/for-growers', '/for-makers', '/login']);

injectAnalytics({
	mode: dev ? 'development' : 'production',
	beforeSend: (event) => {
		const path = new URL(event.url).pathname;
		return TRACKED_PATHS.has(path) ? event : null;
	}
});
