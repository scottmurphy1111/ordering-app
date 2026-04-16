import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

// Netlify provides URL (the deploy-specific URL) and DEPLOY_PRIME_URL for previews.
// Fall back through them so OAuth redirects work on deploy previews too.
const baseURL = env.ORIGIN || env.URL || env.DEPLOY_PRIME_URL;

export const auth = betterAuth({
	baseURL,
	trustedOrigins: [baseURL].filter((s): s is string => Boolean(s)),
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),

	emailAndPassword: { enabled: true },

	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID ?? '',
			clientSecret: env.GOOGLE_CLIENT_SECRET ?? ''
		}
	},

	plugins: [
		sveltekitCookies(getRequestEvent) // must be last
	]
});
