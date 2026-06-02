import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { db } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { orders } from '$lib/server/db/schema';
import { specialOrderPayments } from '$lib/server/db/special-orders';
import { sendEmail } from '$lib/server/email';
import { recordNotification, shouldSendEmail } from '$lib/server/notifications';
import { orderConfirmedEmail } from '$lib/server/email/templates/orderConfirmed';
import { orderCancelledEmail } from '$lib/server/email/templates/orderCancelled';
import { orderRefundedEmail } from '$lib/server/email/templates/orderRefunded';
import { customDateOrderRecoveredEmail } from '$lib/server/email/templates/customDateOrderRecovered';
import { specialOrderAcceptedEmail } from '$lib/server/email/templates/specialOrderAccepted';
import { specialOrderAcceptedVendorEmail } from '$lib/server/email/templates/specialOrderAcceptedVendor';
import { orderReceivedVendorEmail } from '$lib/server/email/templates/orderReceivedVendor';
import { reconcileSpecialOrderInstallment } from '$lib/server/special-orders/payments';
import { sendSms } from '$lib/server/sms';
import type { AddonItem } from '$lib/billing';
import { vendorUrl } from '$lib/server/vendor-origin';
import { env } from '$env/dynamic/private';
import type { PickupWindowSnapshot } from '$lib/server/pickup/checkout';
import { HORIZON_DAYS } from '$lib/server/pickup/lifecycle';
import { generateOrderNumber } from '$lib/server/order-number';

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
			timezone: true,
			email: true,
			subscriptionTier: true,
			addons: true
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
		subscriptionTier: vendorRecord.subscriptionTier ?? undefined,
		addons: vendorRecord.addons,
		slug: vendorRecord.slug,
		timezone: vendorRecord.timezone ?? 'America/New_York',
		email: vendorRecord.email ?? null
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
	subscriptionTier?: string;
	addons?: AddonItem[] | null;
	slug: string;
	timezone: string;
	email: string | null;
};

function orderUrl(vendorSlug: string, orderId: number) {
	return vendorUrl(vendorSlug, `/orders/${orderId}`);
}

async function handleEvent(event: Stripe.Event, ctx: VendorCtx) {
	switch (event.type) {
		case 'payment_intent.succeeded': {
			const intent = event.data.object as Stripe.PaymentIntent;

			// Catering installments: reconcile deposit/balance/full PIs against their
			// special_order_payments row; the order's paymentStatus is derived there
			// (deposit_paid vs paid) — never blanket 'paid'.
			if (intent.metadata?.paymentPhase) {
				await reconcileSpecialOrderInstallment(intent, ctx.id);
				break;
			}

			const existing = await db.query.orders.findFirst({
				where: eq(orders.stripePaymentIntentId, intent.id),
				columns: {
					status: true,
					paymentStatus: true,
					pickupWindowSnapshot: true,
					scheduledFor: true
				}
			});

			if (!existing) break;

			// Already reconciled synchronously (approve action or page-load reconciliation).
			// Prevents silent 'received → confirmed' overwrite for custom-date orders.
			if (existing.paymentStatus === 'paid') break;

			// Recovery: customer retried a failed payment on an existing order.
			// Windowed flow: fresh checkout completing normally.
			const isRecovery = existing.status === 'payment_failed';

			let targetStatus: 'received' | 'confirmed' | 'scheduled';
			if (isRecovery) {
				targetStatus = 'received';
			} else {
				// Far-future windowed orders stay 'scheduled' until the cron promotes them.
				// Mirrors the same horizon logic in create-payment-intent at order creation.
				const snapshot = existing.pickupWindowSnapshot as PickupWindowSnapshot | null;
				const startsAt = snapshot?.startsAt
					? new Date(snapshot.startsAt)
					: existing.scheduledFor
						? new Date(existing.scheduledFor)
						: null;
				const horizonCutoff = new Date(Date.now() + HORIZON_DAYS * 24 * 60 * 60 * 1000);
				targetStatus = startsAt && startsAt > horizonCutoff ? 'scheduled' : 'confirmed';
			}

			const [order] = await db
				.update(orders)
				.set({ paymentStatus: 'paid', status: targetStatus, updatedAt: new Date() })
				.where(eq(orders.stripePaymentIntentId, intent.id))
				.returning();
			if (order?.customerEmail) {
				if (isRecovery) {
					await sendEmail({
						to: order.customerEmail,
						subject: `Payment confirmed for order ${order.orderNumber} — ${ctx.name}`,
						html: customDateOrderRecoveredEmail({
							vendorName: ctx.name,
							primaryColor: ctx.primaryColor,
							vendorSubscriptionTier: ctx.subscriptionTier,
							orderNumber: order.orderNumber,
							customerName: order.customerName ?? 'there',
							items: order.items as Parameters<typeof customDateOrderRecoveredEmail>[0]['items'],
							subtotal: order.subtotal,
							tax: order.tax,
							tip: order.tip ?? 0,
							total: order.total,
							scheduledFor: order.scheduledFor!,
							vendorTimezone: ctx.timezone,
							notes: order.notes,
							orderStatusUrl: orderUrl(ctx.slug, order.id)
						}),
						fromName: ctx.name,
						replyTo: ctx.email ?? undefined,
						category: 'custom_date_recovered'
					}).catch(console.error);
				} else if (order.specialOrderRequestId) {
					await sendEmail({
						to: order.customerEmail,
						subject: `Order ${order.orderNumber} confirmed — ${ctx.name}`,
						html: specialOrderAcceptedEmail({
							vendorName: ctx.name,
							primaryColor: ctx.primaryColor,
							vendorSubscriptionTier: ctx.subscriptionTier,
							orderNumber: order.orderNumber,
							customerName: order.customerName ?? 'there',
							priceCents: order.total,
							notes: order.notes,
							scheduledFor: order.scheduledFor,
							vendorTimezone: ctx.timezone,
							orderStatusUrl: orderUrl(ctx.slug, order.id)
						}),
						fromName: ctx.name,
						replyTo: ctx.email ?? undefined,
						category: 'special_order_accepted'
					}).catch(console.error);
					await recordNotification({
						vendorId: ctx.id,
						category: 'special_order_accepted_vendor',
						title: `Custom order accepted — ${order.orderNumber}`,
						body: `${order.customerName ?? 'A customer'} accepted your quote.`,
						severity: 'info',
						actionUrl: `/dashboard/orders/${order.id}`,
						actionLabel: 'View order'
					});
					if (ctx.email && (await shouldSendEmail(ctx.id, 'special_order_accepted_vendor'))) {
						await sendEmail({
							to: ctx.email,
							subject: `New special order ${order.orderNumber} from ${order.customerName ?? 'a customer'}`,
							html: specialOrderAcceptedVendorEmail({
								vendorName: ctx.name,
								primaryColor: ctx.primaryColor,
								customerName: order.customerName ?? 'there',
								customerEmail: order.customerEmail ?? '',
								customerPhone: order.customerPhone ?? null,
								orderNumber: order.orderNumber,
								priceCents: order.total,
								notes: order.notes,
								scheduledFor: order.scheduledFor,
								vendorTimezone: ctx.timezone,
								orderStatusUrl: `${env.ORIGIN ?? 'https://app.getorderlocal.com'}/dashboard/orders/${order.id}`
							}),
							category: 'special_order_accepted_vendor'
						}).catch(console.error);
					}
				} else {
					await sendEmail({
						to: order.customerEmail,
						subject: `Order ${order.orderNumber} confirmed — ${ctx.name}`,
						html: orderConfirmedEmail({
							vendorName: ctx.name,
							primaryColor: ctx.primaryColor,
							vendorSubscriptionTier: ctx.subscriptionTier,
							orderNumber: order.orderNumber,
							customerName: order.customerName ?? 'there',
							items: order.items as Parameters<typeof orderConfirmedEmail>[0]['items'],
							subtotal: order.subtotal,
							tax: order.tax,
							tip: order.tip ?? 0,
							total: order.total,
							orderType: order.type,
							notes: order.notes,
							pickupMode: order.pickupMode,
							pickupWindowSnapshot: order.pickupWindowSnapshot as PickupWindowSnapshot | null,
							scheduledFor: order.scheduledFor,
							vendorTimezone: ctx.timezone
						}),
						fromName: ctx.name,
						replyTo: ctx.email ?? undefined,
						category: 'order_confirmed'
					}).catch(console.error);
					if (
						ctx.email &&
						order.type !== 'special_order' &&
						(await shouldSendEmail(ctx.id, 'order_received_vendor'))
					) {
						await sendEmail({
							to: ctx.email,
							subject: `New order ${order.orderNumber} from ${order.customerName ?? 'a customer'} — $${(order.total / 100).toFixed(2)}`,
							html: orderReceivedVendorEmail({
								vendorName: ctx.name,
								primaryColor: ctx.primaryColor,
								vendorSubscriptionTier: ctx.subscriptionTier,
								customerName: order.customerName ?? 'there',
								orderNumber: order.orderNumber,
								total: order.total,
								items: order.items as Parameters<typeof orderReceivedVendorEmail>[0]['items'],
								pickupMode: order.pickupMode,
								pickupWindowSnapshot: order.pickupWindowSnapshot as PickupWindowSnapshot | null,
								scheduledFor: order.scheduledFor,
								vendorTimezone: ctx.timezone,
								orderStatusUrl: `${env.ORIGIN ?? 'https://app.getorderlocal.com'}/dashboard/orders/${order.id}`
							}),
							category: 'order_received_vendor'
						}).catch(console.error);
					}
				}
			}
			if (order?.customerPhone) {
				if (isRecovery) {
					await sendSms(
						order.customerPhone,
						`${ctx.name}: Payment confirmed for order ${order.orderNumber}. We'll see you on your requested date. Track: ${orderUrl(ctx.slug, order.id)}`,
						{ subscriptionTier: ctx.subscriptionTier, addons: ctx.addons }
					).catch(console.error);
				} else {
					await sendSms(
						order.customerPhone,
						`${ctx.name}: Order ${order.orderNumber} confirmed! We'll text you when it's ready. Track: ${orderUrl(ctx.slug, order.id)}`,
						{ subscriptionTier: ctx.subscriptionTier, addons: ctx.addons }
					).catch(console.error);
				}
			}
			break;
		}

		case 'payment_intent.payment_failed':
		case 'payment_intent.canceled': {
			const intent = event.data.object as Stripe.PaymentIntent;

			// A failed BALANCE payment must not cancel a deposit-paid order — the deposit
			// was already collected. Leave the order untouched (stays deposit_paid) and
			// return the Balance installment to 'scheduled' so the customer can retry the
			// balance link. Deposit/full first-payment failures fall through and cancel
			// as before (no money was collected).
			if (intent.metadata?.paymentPhase === 'balance') {
				await db
					.update(specialOrderPayments)
					.set({ status: 'scheduled' })
					.where(eq(specialOrderPayments.stripePaymentIntentId, intent.id));
				break;
			}

			const existingFailed = await db.query.orders.findFirst({
				where: eq(orders.stripePaymentIntentId, intent.id),
				columns: { status: true }
			});

			if (!existingFailed) break;

			// A recovery PaymentIntent that fails should NOT cancel the order — the customer
			// can retry from the recovery banner. Leave the order in payment_failed.
			if (existingFailed.status === 'payment_failed') break;

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
						vendorName: ctx.name,
						primaryColor: ctx.primaryColor,
						vendorSubscriptionTier: ctx.subscriptionTier,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						total: order.total
					}),
					fromName: ctx.name,
					replyTo: ctx.email ?? undefined,
					category: 'order_cancelled'
				}).catch(console.error);
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${ctx.name}: Your order ${order.orderNumber} has been cancelled.`,
					{ subscriptionTier: ctx.subscriptionTier, addons: ctx.addons }
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
						vendorName: ctx.name,
						primaryColor: ctx.primaryColor,
						vendorSubscriptionTier: ctx.subscriptionTier,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						total: order.total
					}),
					fromName: ctx.name,
					replyTo: ctx.email ?? undefined,
					category: 'order_refunded'
				}).catch(console.error);
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${ctx.name}: Your refund for order ${order.orderNumber} has been processed.`,
					{ subscriptionTier: ctx.subscriptionTier, addons: ctx.addons }
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
						vendorName: ctx.name,
						primaryColor: ctx.primaryColor,
						vendorSubscriptionTier: ctx.subscriptionTier,
						orderNumber: order.orderNumber,
						customerName: order.customerName ?? 'there',
						items: order.items as Parameters<typeof orderConfirmedEmail>[0]['items'],
						subtotal: order.subtotal,
						tax: order.tax,
						tip: order.tip ?? 0,
						total: order.total,
						orderType: order.type,
						notes: order.notes,
						pickupMode: order.pickupMode,
						pickupWindowSnapshot: order.pickupWindowSnapshot as PickupWindowSnapshot | null,
						scheduledFor: order.scheduledFor,
						vendorTimezone: ctx.timezone
					}),
					fromName: ctx.name,
					replyTo: ctx.email ?? undefined,
					category: 'order_confirmed'
				}).catch(console.error);
				if (
					ctx.email &&
					order.type !== 'special_order' &&
					(await shouldSendEmail(ctx.id, 'order_received_vendor'))
				) {
					await sendEmail({
						to: ctx.email,
						subject: `New order ${order.orderNumber} from ${order.customerName ?? 'a customer'} — $${(order.total / 100).toFixed(2)}`,
						html: orderReceivedVendorEmail({
							vendorName: ctx.name,
							primaryColor: ctx.primaryColor,
							vendorSubscriptionTier: ctx.subscriptionTier,
							customerName: order.customerName ?? 'there',
							orderNumber: order.orderNumber,
							total: order.total,
							items: order.items as Parameters<typeof orderReceivedVendorEmail>[0]['items'],
							pickupMode: order.pickupMode,
							pickupWindowSnapshot: order.pickupWindowSnapshot as PickupWindowSnapshot | null,
							scheduledFor: order.scheduledFor,
							vendorTimezone: ctx.timezone,
							orderStatusUrl: `${env.ORIGIN ?? 'https://app.getorderlocal.com'}/dashboard/orders/${order.id}`
						}),
						category: 'order_received_vendor'
					}).catch(console.error);
				}
			}
			if (order?.customerPhone) {
				await sendSms(
					order.customerPhone,
					`${ctx.name}: Order ${order.orderNumber} confirmed! We'll text you when it's ready. Track: ${orderUrl(vendorSlug, order.id)}`,
					{ subscriptionTier: ctx.subscriptionTier, addons: ctx.addons }
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

			const orderNumber = await generateOrderNumber(ctx.id, db);
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
						vendorName: ctx.name,
						primaryColor: ctx.primaryColor,
						vendorSubscriptionTier: ctx.subscriptionTier,
						orderNumber: recurring.orderNumber,
						customerName: recurring.customerName ?? 'there',
						items: recurring.items as Parameters<typeof orderConfirmedEmail>[0]['items'],
						subtotal: recurring.subtotal,
						tax: 0,
						tip: 0,
						total: recurring.total,
						orderType: 'subscription',
						notes: null
					}),
					fromName: ctx.name,
					replyTo: ctx.email ?? undefined,
					category: 'order_confirmed'
				}).catch(console.error);
			}
			if (recurring?.customerPhone) {
				await sendSms(
					recurring.customerPhone,
					`${ctx.name}: Your subscription has renewed. Order ${recurring.orderNumber} — ${orderUrl(ctx.slug, recurring.id)}`,
					{ subscriptionTier: ctx.subscriptionTier, addons: ctx.addons }
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
