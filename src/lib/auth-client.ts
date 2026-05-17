import { createAuthClient } from 'better-auth/svelte';
import { magicLinkClient } from 'better-auth/client/plugins';
import { env as publicEnv } from '$env/dynamic/public';

// All auth API calls (sign-in, sign-out, OAuth callback, session) must go to
// the auth host — the host where BetterAuth's baseURL is configured.
//
// In production:  apex (getorderlocal.com) — BetterAuth is configured there.
// In preview/branch deploys: same single host for everything.
// In dev: localhost (same host for everything).
//
// Without an explicit baseURL, better-auth infers the API host from
// window.location.origin. On the dashboard subdomain (app.X), that would be
// app.X — which doesn't serve /api/auth/*, producing 404s on signout.
//
// Session cookies are Domain=.getorderlocal.com in production, so cross-host
// POSTs from app.X carry the session to getorderlocal.com correctly.
const authBaseURL =
	publicEnv.PUBLIC_AUTH_ORIGIN ||
	(typeof window !== 'undefined' ? window.location.origin : undefined);

export const authClient = createAuthClient({
	baseURL: authBaseURL,
	plugins: [magicLinkClient()]
});

export const { signIn, signOut, useSession } = authClient;
