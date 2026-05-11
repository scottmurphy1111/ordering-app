import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
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
	const vendorId = locals.vendorId!;
	const record = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: {
			stripeSecretKey: true,
			stripePublishableKey: true,
			stripeWebhookSecret: true,
			stripeWebhookEndpointId: true
		}
	});

	function maskKey(key: string | null | undefined): string | null {
		if (!key) return null;
		if (key.length <= 12) return key.slice(0, 4) + '••••••••';
		return key.slice(0, 10) + '••••••••••••' + key.slice(-4);
	}

	return {
		hasStripeKey: !!record?.stripeSecretKey,
		hasStripePublishableKey: !!record?.stripePublishableKey,
		hasStripeWebhookSecret: !!record?.stripeWebhookSecret,
		stripeKeyMasked: maskKey(record?.stripeSecretKey),
		stripePublishableKeyMasked: maskKey(record?.stripePublishableKey),
		stripeWebhookMasked: maskKey(record?.stripeWebhookSecret),
		hasWebhookEndpoint: !!record?.stripeWebhookEndpointId
	};
};

export const actions: Actions = {
	saveStripePublishableKey: async ({ request, locals }) => {
		requireOwner(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const newKey = formData.get('stripePublishableKey')?.toString().trim() || null;

		if (!newKey) return fail(400, { error: 'Publishable key is required' });
		if (!newKey.startsWith('pk_'))
			return fail(400, { error: 'Publishable key must start with pk_' });

		await db
			.update(vendor)
			.set({ stripePublishableKey: newKey })
			.where(eq(vendor.id, vendorId));

		return { publishableSuccess: true };
	},

	saveStripeSecretKey: async ({ request, locals }) => {
		requireOwner(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const newKey = formData.get('stripeSecretKey')?.toString().trim() || null;

		if (!newKey) return fail(400, { error: 'Secret key is required' });
		if (!newKey.startsWith('sk_'))
			return fail(400, { error: 'Must be a Stripe secret key (starts with sk_)' });

		const existing = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				stripeSecretKey: true,
				stripeWebhookSecret: true,
				stripeWebhookEndpointId: true,
				slug: true
			}
		});

		const keyChanged = newKey !== existing?.stripeSecretKey;

		try {
			const stripe = new Stripe(newKey);
			await stripe.products.list({ limit: 1 });
		} catch {
			return fail(400, {
				error: 'Could not connect to Stripe with that key. Please check it and try again.'
			});
		}

		if (existing?.stripeWebhookEndpointId && existing.stripeSecretKey && keyChanged) {
			const oldStripe = new Stripe(existing.stripeSecretKey);
			await oldStripe.webhookEndpoints.del(existing.stripeWebhookEndpointId).catch(() => {});
		}

		const isPublicUrl = env.ORIGIN?.startsWith('https://');
		let webhookSecret: string | null = existing?.stripeWebhookSecret ?? null;
		let webhookEndpointId: string | null = existing?.stripeWebhookEndpointId ?? null;

		if (isPublicUrl && (keyChanged || !webhookEndpointId)) {
			const stripe = new Stripe(newKey);
			const webhookUrl = `${env.ORIGIN}/api/webhooks/stripe/${existing!.slug}`;
			const endpoint = await stripe.webhookEndpoints.create({
				url: webhookUrl,
				enabled_events: WEBHOOK_EVENTS
			});
			webhookSecret = endpoint.secret ?? null;
			webhookEndpointId = endpoint.id;
		} else if (keyChanged && !isPublicUrl) {
			webhookSecret = null;
			webhookEndpointId = null;
		}

		await db
			.update(vendor)
			.set({
				stripeSecretKey: newKey,
				stripeWebhookSecret: webhookSecret,
				stripeWebhookEndpointId: webhookEndpointId
			})
			.where(eq(vendor.id, vendorId));

		return { secretSuccess: true };
	},

	clearStripeKey: async ({ locals }) => {
		requireOwner(locals);
		const vendorId = locals.vendorId!;

		const record = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { stripeSecretKey: true, stripeWebhookEndpointId: true }
		});
		if (record?.stripeWebhookEndpointId && record.stripeSecretKey) {
			const stripe = new Stripe(record.stripeSecretKey);
			await stripe.webhookEndpoints.del(record.stripeWebhookEndpointId).catch(() => {});
		}

		await db
			.update(vendor)
			.set({
				stripeSecretKey: null,
				stripePublishableKey: null,
				stripeWebhookSecret: null,
				stripeWebhookEndpointId: null
			})
			.where(eq(vendor.id, vendorId));
		return { cleared: true };
	}
};
