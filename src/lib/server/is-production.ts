import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

/**
 * True only when running in the canonical production environment (the
 * getorderlocal.com three-host split). Vercel preview deploys and local dev
 * both return false.
 *
 * Used to gate behavior that only makes sense on the real domain:
 *   - Cross-subdomain session cookies (Domain=.getorderlocal.com)
 *   - Cross-host redirects between apex and app subdomain
 *
 * Preview deploys are single-host on *.vercel.app — browsers reject cookies
 * with Domain=.getorderlocal.com on those hosts, so preview needs the same
 * host-only cookie behavior as local dev.
 *
 * When VERCEL_ENV is unset (non-Vercel host, self-hosted) and dev is false,
 * returns true — the correct default for any non-dev, non-preview build.
 */
export const isProduction = !dev && env.VERCEL_ENV !== 'preview';
