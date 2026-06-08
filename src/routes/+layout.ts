import { dev } from '$app/environment';
import { injectAnalytics } from '@vercel/analytics/sveltekit';
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

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

// Speed Insights = real-user performance (Core Web Vitals), reported per route.
// Tracked on ALL routes (unlike Analytics above, which is marketing-only) so
// dashboard + storefront performance is visible — that's where slow loads cost
// vendors orders. Auto-detects environment: no-ops in dev, collects only in
// production. `route` is set automatically by the /sveltekit import. If the Hobby
// data-point quota gets tight post-launch, add a beforeSend filter (see below).
injectSpeedInsights();
