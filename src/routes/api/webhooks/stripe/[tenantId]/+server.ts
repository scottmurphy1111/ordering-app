import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { tenant } from '$lib/server/db/tenant';
import { orders } from '$lib/server/db/schema';
import { sendEmail } from '$lib/server/email';
import { orderConfirmedEmail } from '$lib/server/email/templates/orderConfirmed';
import { orderCancelledEmail } from '$lib/server/email/templates/orderCancelled';
import { orderRefundedEmail } from '$lib/server/email/templates/orderRefunded';
import { sendSms } from '$lib/server/sms';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, params }) => {
	const tenantRecord = await db.query.tenant.findFirst({
		where: eq(tenant.id, parseInt(params.tenantId)),
		columns: { stripeSecretKey: true, stripeWebhookSecret: true, isActive: true, name: true, primaryColor: true, slug: true }
	});

	if (!tenantRecord?.isActive) throw error(404, 'Tenant not found');
	if (!tenantRecord.stripeSecretKey) throw error(400, 'Stripe not configured for this tenant');
	if (!tenantRecord.stripeWebhookSecret) throw error(400, 'Webhook secret not configured for this tenant');

	const stripe = new Stripe(tenantRecord.stripeSecretKey);

	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) throw error(400, 'Missing stripe-signature header');

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, signature, tenantRecord.stripeWebhookSecret);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
		throw error(400, 'Invalid webhook signature');
	}

	const tenantCtx = { name: tenantRecord.name, primaryColor: tenantRecord.primaryColor ?? undefined, slug: tenantRecord.slug };

	try {
		await handleEvent(event, tenantCtx);
	} catch (err) {
		console.error(`Error handling webhook event ${event.type}:`, err);
		throw error(500, 'Webhook handler failed');
	}

	return json({ received: true });
};

type TenantCtx = { name: string; primaryColor?: string; slug: string };

function orderUrl(tenantSlug: string, orderId: number) {
	return `${env.ORIGIN}/${tenantSlug}/orders/${orderId}`;
}

async function handleEvent(event: Stripe.Event, tenant: TenantCtx) {
	switch (event.type) {
		case 'payment_intent.succeeded': {
			const intent = event.data.object as Stripe.PaymentIntent;
			const [order] = await db
				.update(orders)
				.set({ paymentStatus: 'paid', status: 'confirmed', updatedAt: new Date() })
				.where(eq(orders.stripePaymentIntentId, intent.id))
				.returning();
			if (order?.customerEmail) {
				await sendEmail({
					to: order.customerEmail,
					subject: `Order ${order.orderNumber} confirmed — ${tenant.name}`,
					html: orderConfirmedEmail({
						tenantName: tenant.name,
						primaryColor: tenant.primaryColor,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						items: order.items as Parameters<typeof orderConfirmedEmail>[0]['items'],
						subtotal: order.subtotal,
						tax: order.tax,
						tip: order.tip ?? 0,
						total: order.total,
						orderType: order.type,
						notes: order.notes
					})
				}).catch(console.error);
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${tenant.name}: Order ${order.orderNumber} confirmed! We'll text you when it's ready. Track: ${orderUrl(tenant.slug, order.id)}`
				).catch(console.error);
			}
			break;
		}

		case 'payment_intent.payment_failed':
		case 'payment_intent.canceled': {
			const intent = event.data.object as Stripe.PaymentIntent;
			const [order] = await db
				.update(orders)
				.set({ paymentStatus: 'failed', status: 'cancelled', updatedAt: new Date() })
				.where(eq(orders.stripePaymentIntentId, intent.id))
				.returning();
			if (order?.customerEmail) {
				await sendEmail({
					to: order.customerEmail,
					subject: `Order ${order.orderNumber} cancelled — ${tenant.name}`,
					html: orderCancelledEmail({
						tenantName: tenant.name,
						primaryColor: tenant.primaryColor,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						total: order.total
					})
				}).catch(console.error);
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${tenant.name}: Your order ${order.orderNumber} has been cancelled.`
				).catch(console.error);
			}
			break;
		}

		case 'charge.refunded': {
			const charge = event.data.object as Stripe.Charge;
			if (!charge.payment_intent) break;
			const intentId =
				typeof charge.payment_intent === 'string'
					? charge.payment_intent
					: charge.payment_intent.id;
			const [order] = await db
				.update(orders)
				.set({ paymentStatus: 'refunded', updatedAt: new Date() })
				.where(eq(orders.stripePaymentIntentId, intentId))
				.returning();
			if (order?.customerEmail) {
				await sendEmail({
					to: order.customerEmail,
					subject: `Refund processed for order ${order.orderNumber} — ${tenant.name}`,
					html: orderRefundedEmail({
						tenantName: tenant.name,
						primaryColor: tenant.primaryColor,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						total: order.total
					})
				}).catch(console.error);
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${tenant.name}: Your refund for order ${order.orderNumber} has been processed.`
				).catch(console.error);
			}
			break;
		}

		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session;
			const orderId = session.metadata?.orderId ? parseInt(session.metadata.orderId) : null;
			const tenantSlug = session.metadata?.tenantSlug ?? '';
			const intentId = session.payment_intent
				? typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent.id
				: null;

			let order;
			if (orderId) {
				[order] = await db
					.update(orders)
					.set({
						paymentStatus: 'paid',
						status: 'confirmed',
						...(intentId ? { stripePaymentIntentId: intentId } : {}),
						updatedAt: new Date()
					})
					.where(eq(orders.id, orderId))
					.returning();
			} else if (intentId) {
				[order] = await db
					.update(orders)
					.set({ paymentStatus: 'paid', status: 'confirmed', updatedAt: new Date() })
					.where(eq(orders.stripePaymentIntentId, intentId))
					.returning();
			}
			if (order?.customerEmail) {
				await sendEmail({
					to: order.customerEmail,
					subject: `Order ${order.orderNumber} confirmed — ${tenant.name}`,
					html: orderConfirmedEmail({
						tenantName: tenant.name,
						primaryColor: tenant.primaryColor,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						items: order.items as Parameters<typeof orderConfirmedEmail>[0]['items'],
						subtotal: order.subtotal,
						tax: order.tax,
						tip: order.tip ?? 0,
						total: order.total,
						orderType: order.type,
						notes: order.notes
					})
				}).catch(console.error);
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${tenant.name}: Order ${order.orderNumber} confirmed! We'll text you when it's ready. Track: ${orderUrl(tenantSlug, order.id)}`
				).catch(console.error);
			}
			break;
		}

		case 'product.created':
		case 'product.updated':
		case 'price.created':
		case 'price.updated':
		case 'payment_intent.created':
		case 'charge.succeeded':
		case 'charge.updated':
			break;

		default:
			console.log(`Unhandled Stripe webhook event: ${event.type}`);
	}
}
