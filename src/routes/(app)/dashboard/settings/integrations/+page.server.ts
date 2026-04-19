import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/tenant';
import Stripe from 'stripe';
import { requireOwner } from '$lib/server/roles';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;
	const record = await db.query.tenant.findFirst({
		where: eq(tenant.id, tenantId),
		columns: { stripeSecretKey: true, stripeWebhookSecret: true }
	});

	return {
		hasStripeKey: !!record?.stripeSecretKey,
		hasStripeWebhookSecret: !!record?.stripeWebhookSecret
	};
};

export const actions: Actions = {
	saveStripeKey: async ({ request, locals }) => {
		requireOwner(locals);
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const key = formData.get('stripeSecretKey')?.toString().trim();

		if (!key) return fail(400, { error: 'API key is required' });
		if (!key.startsWith('sk_')) return fail(400, { error: 'Must be a Stripe secret key (starts with sk_)' });

		try {
			const stripe = new Stripe(key);
			await stripe.products.list({ limit: 1 });
		} catch {
			return fail(400, { error: 'Could not connect to Stripe with that key. Please check it and try again.' });
		}

		await db.update(tenant).set({ stripeSecretKey: key }).where(eq(tenant.id, tenantId));
		return { success: true };
	},

	clearStripeKey: async ({ locals }) => {
		requireOwner(locals);
		const tenantId = locals.tenantId!;
		await db.update(tenant).set({ stripeSecretKey: null, stripeWebhookSecret: null }).where(eq(tenant.id, tenantId));
		return { cleared: true };
	},

	saveWebhookSecret: async ({ request, locals }) => {
		requireOwner(locals);
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const secret = formData.get('stripeWebhookSecret')?.toString().trim();

		if (!secret) return fail(400, { error: 'Webhook secret is required' });
		if (!secret.startsWith('whsec_')) return fail(400, { error: 'Must be a Stripe webhook secret (starts with whsec_)' });

		await db.update(tenant).set({ stripeWebhookSecret: secret }).where(eq(tenant.id, tenantId));
		return { webhookSaved: true };
	},

	clearWebhookSecret: async ({ locals }) => {
		requireOwner(locals);
		const tenantId = locals.tenantId!;
		await db.update(tenant).set({ stripeWebhookSecret: null }).where(eq(tenant.id, tenantId));
		return { webhookCleared: true };
	}
};
