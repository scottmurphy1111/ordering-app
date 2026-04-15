import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/tenant';
import Stripe from 'stripe';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;
	const record = await db.query.tenant.findFirst({
		where: eq(tenant.id, tenantId),
		columns: { stripeSecretKey: true }
	});

	return {
		// Only tell the UI whether a key is saved — never send the raw key to the client
		hasStripeKey: !!record?.stripeSecretKey
	};
};

export const actions: Actions = {
	saveStripeKey: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const key = formData.get('stripeSecretKey')?.toString().trim();

		if (!key) return fail(400, { error: 'API key is required' });
		if (!key.startsWith('sk_')) return fail(400, { error: 'Must be a Stripe secret key (starts with sk_)' });

		// Validate the key works before saving
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
		const tenantId = locals.tenantId!;
		await db.update(tenant).set({ stripeSecretKey: null }).where(eq(tenant.id, tenantId));
		return { cleared: true };
	}
};
