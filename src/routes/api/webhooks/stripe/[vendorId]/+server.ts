import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { db } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { orders } from '$lib/server/db/schema';
import { sendEmail } from '$lib/server/email';
import { orderConfirmedEmail } from '$lib/server/email/templates/orderConfirmed';
import { orderCancelledEmail } from '$lib/server/email/templates/orderCancelled';
import { orderRefundedEmail } from '$lib/server/email/templates/orderRefunded';
import { sendSms } from '$lib/server/sms';
import { env } from '$env/dynamic/private';
import type { PickupWindowSnapshot } from '$lib/server/pickup/checkout';

export const POST: RequestHandler = async ({ request, params }) => {
	const numericId = parseInt(params.vendorId);
	const vendorRecord = await db.query.vendor.findFirst({
		where: isNaN(numericId) ? eq(vendor.slug, params.vendorId) : eq(vendor.id, numericId),
		columns: {
			id: true,
			stripeSecretKey: true,
			stripeWebhookSecret: true,
			isActive: true,
			name: true,
			backgroundColor: true,
			slug: true,
			timezone: true
		}
	});

	if (!vendorRecord?.isActive) throw error(404, 'Vendor not found');
	if (!vendorRecord.stripeSecretKey) throw error(400, 'Stripe not configured for this vendor');
	if (!vendorRecord.stripeWebhookSecret)
		throw error(400, 'Webhook secret not configured for this vendor');

	const stripe = new Stripe(vendorRecord.stripeSecretKey);

	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) throw error(400, 'Missing stripe-signature header');

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, signature, vendorRecord.stripeWebhookSecret);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
		throw error(400, 'Invalid webhook signature');
	}

	const vendorCtx = {
		id: vendorRecord.id,
		name: vendorRecord.name,
		primaryColor: vendorRecord.backgroundColor ?? undefined,
		slug: vendorRecord.slug,
		timezone: vendorRecord.timezone ?? 'America/New_York'
	};

	try {
		await handleEvent(event, vendorCtx);
	} catch (err) {
		console.error(`Error handling webhook event ${event.type}:`, err);
		throw error(500, 'Webhook handler failed');
	}

	return json({ received: true });
};

type VendorCtx = {
	id: number;
	name: string;
	primaryColor?: string;
	slug: string;
	timezone: string;
};

function generateOrderNumber(): string {
	const ts = Date.now().toString(36).toUpperCase();
	const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
	return `#${ts}-${rand}`;
}

function orderUrl(vendorSlug: string, orderId: number) {
	return `${env.ORIGIN}/${vendorSlug}/orders/${orderId}`;
}

async function handleEvent(event: Stripe.Event, ctx: VendorCtx) {
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
					subject: `Order ${order.orderNumber} confirmed — ${ctx.name}`,
					html: orderConfirmedEmail({
						tenantName: ctx.name,
						primaryColor: ctx.primaryColor,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						items: order.items as Parameters<typeof orderConfirmedEmail>[0]['items'],
						subtotal: order.subtotal,
						tax: order.tax,
						tip: order.tip ?? 0,
						total: order.total,
						orderType: order.type,
						notes: order.notes,
						pickupWindowSnapshot: order.pickupWindowSnapshot as PickupWindowSnapshot | null,
						scheduledFor: order.scheduledFor,
						vendorTimezone: ctx.timezone
					})
				}).catch(console.error);
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${ctx.name}: Order ${order.orderNumber} confirmed! We'll text you when it's ready. Track: ${orderUrl(ctx.slug, order.id)}`
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
					subject: `Order ${order.orderNumber} cancelled — ${ctx.name}`,
					html: orderCancelledEmail({
						tenantName: ctx.name,
						primaryColor: ctx.primaryColor,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						total: order.total
					})
				}).catch(console.error);
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${ctx.name}: Your order ${order.orderNumber} has been cancelled.`
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
					subject: `Refund processed for order ${order.orderNumber} — ${ctx.name}`,
					html: orderRefundedEmail({
						tenantName: ctx.name,
						primaryColor: ctx.primaryColor,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						total: order.total
					})
				}).catch(console.error);
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${ctx.name}: Your refund for order ${order.orderNumber} has been processed.`
				).catch(console.error);
			}
			break;
		}

		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session;
			const orderId = session.metadata?.orderId ? parseInt(session.metadata.orderId) : null;
			const vendorSlug = session.metadata?.vendorSlug ?? '';
			const intentId = session.payment_intent
				? typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent.id
				: null;
			const subscriptionId = session.subscription
				? typeof session.subscription === 'string'
					? session.subscription
					: (session.subscription as Stripe.Subscription).id
				: null;

			let order;
			if (orderId) {
				[order] = await db
					.update(orders)
					.set({
						paymentStatus: 'paid',
						status: 'confirmed',
						...(intentId ? { stripePaymentIntentId: intentId } : {}),
						...(subscriptionId
							? { metadata: { stripeSessionId: session.id, stripeSubscriptionId: subscriptionId } }
							: { metadata: { stripeSessionId: session.id } }),
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
					subject: `Order ${order.orderNumber} confirmed — ${ctx.name}`,
					html: orderConfirmedEmail({
						tenantName: ctx.name,
						primaryColor: ctx.primaryColor,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						items: order.items as Parameters<typeof orderConfirmedEmail>[0]['items'],
						subtotal: order.subtotal,
						tax: order.tax,
						tip: order.tip ?? 0,
						total: order.total,
						orderType: order.type,
						notes: order.notes,
						pickupWindowSnapshot: order.pickupWindowSnapshot as PickupWindowSnapshot | null,
						scheduledFor: order.scheduledFor,
						vendorTimezone: ctx.timezone
					})
				}).catch(console.error);
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${ctx.name}: Order ${order.orderNumber} confirmed! We'll text you when it's ready. Track: ${orderUrl(vendorSlug, order.id)}`
				).catch(console.error);
			}
			break;
		}

		case 'invoice.payment_succeeded': {
			const invoice = event.data.object as Stripe.Invoice;
			if (invoice.billing_reason === 'subscription_create') break;

			const subDetails =
				invoice.parent?.type === 'subscription_details'
					? invoice.parent.subscription_details
					: null;
			const subRaw = subDetails?.subscription;
			const subId = subRaw ? (typeof subRaw === 'string' ? subRaw : subRaw.id) : null;
			if (!subId) break;

			const original = await db.query.orders.findFirst({
				where: sql`${orders.vendorId} = ${ctx.id} AND ${orders.metadata}->>'stripeSubscriptionId' = ${subId}`
			});
			if (!original) {
				console.warn(
					`[webhook] invoice.payment_succeeded: no order found for subscription ${subId}`
				);
				break;
			}

			const orderNumber = generateOrderNumber();
			const [recurring] = await db
				.insert(orders)
				.values({
					vendorId: original.vendorId,
					orderNumber,
					customerName: original.customerName,
					customerEmail: original.customerEmail,
					customerPhone: original.customerPhone,
					type: 'subscription',
					status: 'received',
					paymentStatus: 'paid',
					subtotal: original.subtotal,
					tax: 0,
					deliveryFee: 0,
					tip: 0,
					discount: 0,
					total: original.subtotal,
					items: original.items as unknown[],
					metadata: { stripeSubscriptionId: subId, isRecurring: true }
				})
				.returning();

			if (recurring?.customerEmail) {
				await sendEmail({
					to: recurring.customerEmail,
					subject: `Subscription renewed — ${ctx.name}`,
					html: orderConfirmedEmail({
						tenantName: ctx.name,
						primaryColor: ctx.primaryColor,
						orderNumber: recurring.orderNumber,
						customerName: recurring.customerName ?? 'there',
						items: recurring.items as Parameters<typeof orderConfirmedEmail>[0]['items'],
						subtotal: recurring.subtotal,
						tax: 0,
						tip: 0,
						total: recurring.total,
						orderType: 'subscription',
						notes: null
					})
				}).catch(console.error);
			}
			if (recurring?.customerPhone) {
				await sendSms(
					recurring.customerPhone,
					`${ctx.name}: Your subscription has renewed. Order ${recurring.orderNumber} — ${orderUrl(ctx.slug, recurring.id)}`
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
		case 'invoice.created':
		case 'invoice.finalized':
		case 'invoice.updated':
			break;

		default:
			console.log(`Unhandled Stripe webhook event: ${event.type}`);
	}
}
