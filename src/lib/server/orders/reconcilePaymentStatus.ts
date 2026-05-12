import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { orders } from '$lib/server/db/orders';
import { vendor } from '$lib/server/db/vendor';
import Stripe from 'stripe';
import { sendEmail } from '$lib/server/email';
import { customDateOrderRecoveredEmail } from '$lib/server/email/templates/customDateOrderRecovered';
import { env } from '$env/dynamic/private';

type OrderRow = typeof orders.$inferSelect;

/**
 * Best-effort page-load reconciliation for payment_failed orders.
 *
 * Race condition: after a customer completes 3DS recovery and is redirected
 * back, the order-status page loads before Stripe's webhook fires (~1–5s lag).
 * Without this, the customer sees stale payment_failed state. This function
 * checks the PI directly on page load and silently transitions if succeeded.
 *
 * This is the canonical path for the recovery email in the common case —
 * the webhook's payment_intent.succeeded guard exits early on paymentStatus
 * === 'paid', which will already be true by the time the webhook arrives.
 * Both paths fire at most one email (the DB write is the idempotency gate).
 */
export async function reconcilePaymentStatus(order: OrderRow, vendorId: number): Promise<OrderRow> {
	if (order.status !== 'payment_failed' || !order.stripePaymentIntentId) return order;

	try {
		const vendorRecord = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				stripeSecretKey: true,
				name: true,
				backgroundColor: true,
				slug: true,
				timezone: true
			}
		});
		if (!vendorRecord?.stripeSecretKey) return order;

		const stripe = new Stripe(vendorRecord.stripeSecretKey);
		const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);

		if (pi.status === 'succeeded') {
			const [updated] = await db
				.update(orders)
				.set({ status: 'received', paymentStatus: 'paid', updatedAt: new Date() })
				.where(eq(orders.id, order.id))
				.returning();

			if (updated?.customerEmail) {
				sendEmail({
					to: updated.customerEmail,
					subject: `Payment confirmed for order ${updated.orderNumber} — ${vendorRecord.name}`,
					html: customDateOrderRecoveredEmail({
						vendorName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						orderNumber: updated.orderNumber,
						customerName: updated.customerName ?? 'there',
						items: updated.items as Array<{
							name: string;
							quantity: number;
							basePrice: number;
							selectedModifiers?: Array<{ name: string; priceAdjustment: number }>;
						}>,
						subtotal: updated.subtotal,
						tax: updated.tax,
						tip: updated.tip ?? 0,
						total: updated.total,
						scheduledFor: updated.scheduledFor!,
						vendorTimezone: vendorRecord.timezone ?? 'America/New_York',
						notes: updated.notes,
						orderStatusUrl: `${env.ORIGIN}/${vendorRecord.slug}/orders/${updated.id}`
					})
				}).catch(console.error);
			}

			return updated ?? order;
		}
	} catch {
		// Best-effort; never blocks the page
	}

	return order;
}
