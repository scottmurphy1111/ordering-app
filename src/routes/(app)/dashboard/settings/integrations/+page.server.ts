import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/tenant';
import Stripe from 'stripe';
import { requireOwner } from '$lib/server/roles';
import { env } from '$env/dynamic/private';

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
	'payment_intent.succeeded',
	'payment_intent.payment_failed',
	'payment_intent.canceled',
	'checkout.session.completed',
	'charge.refunded',
	'invoice.payment_succeeded'
];

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;
	const record = await db.query.tenant.findFirst({
		where: eq(tenant.id, tenantId),
		columns: { stripeSecretKey: true, stripeWebhookSecret: true, stripeWebhookEndpointId: true }
	});

	function maskKey(key: string | null | undefined): string | null {
		if (!key) return null;
		if (key.length <= 12) return key.slice(0, 4) + '••••••••';
		return key.slice(0, 10) + '••••••••••••' + key.slice(-4);
	}

	return {
		hasStripeKey: !!record?.stripeSecretKey,
		hasStripeWebhookSecret: !!record?.stripeWebhookSecret,
		stripeKeyMasked: maskKey(record?.stripeSecretKey),
		stripeWebhookMasked: maskKey(record?.stripeWebhookSecret),
		hasWebhookEndpoint: !!record?.stripeWebhookEndpointId
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

		let stripe: Stripe;
		try {
			stripe = new Stripe(key);
			await stripe.products.list({ limit: 1 });
		} catch {
			return fail(400, { error: 'Could not connect to Stripe with that key. Please check it and try again.' });
		}

		// Delete old webhook endpoint if one exists
		const existing = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { stripeSecretKey: true, stripeWebhookEndpointId: true }
		});
		if (existing?.stripeWebhookEndpointId && existing.stripeSecretKey) {
			const oldStripe = new Stripe(existing.stripeSecretKey);
			await oldStripe.webhookEndpoints.del(existing.stripeWebhookEndpointId).catch(() => {});
		}

		const tenantRecord = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { slug: true }
		});

		const isPublicUrl = env.ORIGIN?.startsWith('https://');
		let webhookSecret: string | null = null;
		let webhookEndpointId: string | null = null;

		if (isPublicUrl) {
			const webhookUrl = `${env.ORIGIN}/api/webhooks/stripe/${tenantRecord!.slug}`;
			const endpoint = await stripe.webhookEndpoints.create({
				url: webhookUrl,
				enabled_events: WEBHOOK_EVENTS
			});
			webhookSecret = endpoint.secret ?? null;
			webhookEndpointId = endpoint.id;
		}

		await db.update(tenant).set({
			stripeSecretKey: key,
			stripeWebhookSecret: webhookSecret,
			stripeWebhookEndpointId: webhookEndpointId
		}).where(eq(tenant.id, tenantId));

		return { success: true };
	},

	clearStripeKey: async ({ locals }) => {
		requireOwner(locals);
		const tenantId = locals.tenantId!;

		// Delete Stripe webhook endpoint before clearing the key
		const record = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { stripeSecretKey: true, stripeWebhookEndpointId: true }
		});
		if (record?.stripeWebhookEndpointId && record.stripeSecretKey) {
			const stripe = new Stripe(record.stripeSecretKey);
			await stripe.webhookEndpoints.del(record.stripeWebhookEndpointId).catch(() => {});
		}

		await db.update(tenant).set({
			stripeSecretKey: null,
			stripeWebhookSecret: null,
			stripeWebhookEndpointId: null
		}).where(eq(tenant.id, tenantId));
		return { cleared: true };
	},

};
