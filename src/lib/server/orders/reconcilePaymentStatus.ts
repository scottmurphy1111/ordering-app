import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { orders } from '$lib/server/db/orders';
import { vendor } from '$lib/server/db/vendor';
import Stripe from 'stripe';

type OrderRow = typeof orders.$inferSelect;

export async function reconcilePaymentStatus(order: OrderRow, vendorId: number): Promise<OrderRow> {
	if (order.status !== 'payment_failed' || !order.stripePaymentIntentId) return order;

	try {
		const vendorRecord = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { stripeSecretKey: true }
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
			return updated ?? order;
		}
	} catch {
		// Best-effort; never blocks the page
	}

	return order;
}
