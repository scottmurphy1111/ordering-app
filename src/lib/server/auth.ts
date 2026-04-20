import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { magicLink } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';
import { emailWrapper } from '$lib/server/email/base';

// Netlify provides URL (the deploy-specific URL) and DEPLOY_PRIME_URL for previews.
// Fall back through them so OAuth redirects work on deploy previews too.
const baseURL = env.ORIGIN || env.URL || env.DEPLOY_PRIME_URL;

export const auth = betterAuth({
	baseURL,
	trustedOrigins: [baseURL].filter((s): s is string => Boolean(s)),
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),

	user: {
		additionalFields: {
			isInternal: { type: 'boolean', defaultValue: false, input: false }
		}
	},

	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID ?? '',
			clientSecret: env.GOOGLE_CLIENT_SECRET ?? ''
		}
	},

	plugins: [
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				const html = emailWrapper({
					title: 'Sign in to Order Local',
					previewText: 'Your sign-in link for Order Local',
					tenantName: 'Order Local',
					content: `
						<p style="margin:0 0 16px;font-size:16px;color:#111827;">Click the button below to sign in to your Order Local account. This link expires in 15 minutes.</p>
						<a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Sign in</a>
						<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">If you didn't request this, you can safely ignore this email.</p>
					`
				});
				await sendEmail({ to: email, subject: 'Sign in to Order Local', html });
			}
		}),
		sveltekitCookies(getRequestEvent) // must be last
	]
});
