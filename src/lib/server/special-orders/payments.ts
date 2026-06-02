import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { orders } from '$lib/server/db/orders';
import { specialOrderPayments } from '$lib/server/db/special-orders';
import { vendor } from '$lib/server/db/vendor';
import type Stripe from 'stripe';
import { sendEmail } from '$lib/server/email';
import { recordNotification, shouldSendEmail } from '$lib/server/notifications';
import { specialOrderAcceptedEmail } from '$lib/server/email/templates/specialOrderAccepted';
import { specialOrderAcceptedVendorEmail } from '$lib/server/email/templates/specialOrderAcceptedVendor';
import { specialOrderBalancePaidEmail } from '$lib/server/email/templates/specialOrderBalancePaid';
import { specialOrderBalancePaidVendorEmail } from '$lib/server/email/templates/specialOrderBalancePaidVendor';
import { vendorUrl } from '$lib/server/vendor-origin';
import { env } from '$env/dynamic/private';

/**
 * Reconciles a special-order installment PaymentIntent (deposit / balance /
 * full) against its `special_order_payments` row and derives the order's
 * `paymentStatus` from the full set of installments.
 *
 * Idempotent: no-ops if the matched payment row is already `paid`, so the
 * webhook and any page-load path can both fire for the same PI safely. Never
 * throws — callers (the Stripe webhook) must not fail because of email/DB
 * hiccups here.
 */
export async function reconcileSpecialOrderInstallment(
	intent: Stripe.PaymentIntent,
	vendorId: number
): Promise<void> {
	try {
		// 1. Resolve the payment row: prefer the explicit metadata id, fall back to
		//    a lookup by the stored PI id.
		const paymentIdRaw = intent.metadata?.specialOrderPaymentId;
		let paymentRow = paymentIdRaw
			? await db.query.specialOrderPayments.findFirst({
					where: eq(specialOrderPayments.id, Number(paymentIdRaw))
				})
			: undefined;
		if (!paymentRow) {
			paymentRow = await db.query.specialOrderPayments.findFirst({
				where: eq(specialOrderPayments.stripePaymentIntentId, intent.id)
			});
		}
		if (!paymentRow) return; // Not a special-order installment PI.

		// 2. Idempotency gate.
		if (paymentRow.status === 'paid') return;

		// 3. Mark this installment paid.
		await db
			.update(specialOrderPayments)
			.set({ status: 'paid', paidAt: new Date(), stripePaymentIntentId: intent.id })
			.where(eq(specialOrderPayments.id, paymentRow.id));

		const orderId = paymentRow.orderId;
		if (orderId == null) return;

		// 4. Recompute the order's payment status from ALL its installment rows.
		const allRows = await db.query.specialOrderPayments.findMany({
			where: eq(specialOrderPayments.orderId, orderId)
		});
		const allPaid = allRows.length > 0 && allRows.every((r) => r.status === 'paid');

		const orderRow = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
		if (!orderRow) return;

		let newPaymentStatus: 'paid' | 'deposit_paid';
		let newStatus: 'received' | 'confirmed';
		if (allPaid) {
			newPaymentStatus = 'paid';
			// Catering/special orders are vendor-managed on their own timeline, so a
			// fully-paid order enters the active lifecycle immediately (Confirmed)
			// rather than being parked in 'scheduled' until the pickup horizon.
			newStatus = 'confirmed';
		} else {
			newPaymentStatus = 'deposit_paid';
			newStatus = 'received';
		}

		await db
			.update(orders)
			.set({ paymentStatus: newPaymentStatus, status: newStatus, updatedAt: new Date() })
			.where(eq(orders.id, orderId));

		// 5. Emails. Look up the vendor for name/color/tier/slug/email/timezone.
		const vendorRecord = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: {
				name: true,
				email: true,
				backgroundColor: true,
				slug: true,
				timezone: true,
				subscriptionTier: true
			}
		});
		if (!vendorRecord) return;

		const tz = vendorRecord.timezone ?? 'America/New_York';
		const isBalance = paymentRow.label === 'Balance';

		if (isBalance) {
			// Balance paid — order is now fully paid.
			if (orderRow.customerEmail) {
				await sendEmail({
					to: orderRow.customerEmail,
					subject: `Balance paid for order ${orderRow.orderNumber} — ${vendorRecord.name}`,
					html: specialOrderBalancePaidEmail({
						vendorName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						vendorSubscriptionTier: vendorRecord.subscriptionTier ?? undefined,
						orderNumber: orderRow.orderNumber,
						customerName: orderRow.customerName ?? 'there',
						balanceCents: paymentRow.amountCents,
						totalCents: orderRow.total,
						scheduledFor: orderRow.scheduledFor,
						vendorTimezone: tz,
						orderStatusUrl: vendorUrl(vendorRecord.slug, `/orders/${orderRow.id}`)
					}),
					fromName: vendorRecord.name,
					replyTo: vendorRecord.email ?? undefined,
					category: 'special_order_balance_paid'
				}).catch(console.error);
			}
			if (vendorRecord.email && (await shouldSendEmail(vendorId, 'special_order_balance_paid'))) {
				await sendEmail({
					to: vendorRecord.email,
					subject: `Balance paid — order ${orderRow.orderNumber} from ${orderRow.customerName ?? 'a customer'}`,
					html: specialOrderBalancePaidVendorEmail({
						vendorName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						customerName: orderRow.customerName ?? 'there',
						orderNumber: orderRow.orderNumber,
						balanceCents: paymentRow.amountCents,
						totalCents: orderRow.total,
						orderStatusUrl: `${env.ORIGIN ?? 'https://app.getorderlocal.com'}/dashboard/orders/${orderRow.id}`
					}),
					category: 'special_order_balance_paid'
				}).catch(console.error);
			}
		} else {
			// Deposit or full payment — the order is becoming active. Replicate the
			// special-order acceptance side effects (the webhook's special_order branch
			// is bypassed for paymentPhase PIs): customer specialOrderAccepted, vendor
			// specialOrderAcceptedVendor (shouldSendEmail-guarded), + in-app notification.
			// Deposit/balance split for the acceptance email, when this is a deposit order.
			const depositRow = allRows.find((r) => r.label === 'Deposit');
			const balanceRow = allRows.find((r) => r.label === 'Balance');
			if (orderRow.customerEmail) {
				await sendEmail({
					to: orderRow.customerEmail,
					subject: `Order ${orderRow.orderNumber} confirmed — ${vendorRecord.name}`,
					html: specialOrderAcceptedEmail({
						vendorName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						vendorSubscriptionTier: vendorRecord.subscriptionTier ?? undefined,
						orderNumber: orderRow.orderNumber,
						customerName: orderRow.customerName ?? 'there',
						priceCents: orderRow.total,
						notes: orderRow.notes,
						scheduledFor: orderRow.scheduledFor,
						vendorTimezone: tz,
						orderStatusUrl: vendorUrl(vendorRecord.slug, `/orders/${orderRow.id}`),
						...(depositRow && balanceRow
							? {
									depositCents: depositRow.amountCents,
									balanceCents: balanceRow.amountCents,
									balanceDueAt: balanceRow.dueAt
								}
							: {})
					}),
					fromName: vendorRecord.name,
					replyTo: vendorRecord.email ?? undefined,
					category: 'special_order_accepted'
				}).catch(console.error);
			}
			await recordNotification({
				vendorId,
				category: 'special_order_accepted_vendor',
				title: `Custom order accepted — ${orderRow.orderNumber}`,
				body: `${orderRow.customerName ?? 'A customer'} accepted your quote.`,
				severity: 'info',
				actionUrl: `/dashboard/orders/${orderRow.id}`,
				actionLabel: 'View order'
			});
			if (
				vendorRecord.email &&
				(await shouldSendEmail(vendorId, 'special_order_accepted_vendor'))
			) {
				await sendEmail({
					to: vendorRecord.email,
					subject: `New special order ${orderRow.orderNumber} from ${orderRow.customerName ?? 'a customer'}`,
					html: specialOrderAcceptedVendorEmail({
						vendorName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						customerName: orderRow.customerName ?? 'there',
						customerEmail: orderRow.customerEmail ?? '',
						customerPhone: orderRow.customerPhone ?? null,
						orderNumber: orderRow.orderNumber,
						priceCents: orderRow.total,
						notes: orderRow.notes,
						scheduledFor: orderRow.scheduledFor,
						vendorTimezone: tz,
						orderStatusUrl: `${env.ORIGIN ?? 'https://app.getorderlocal.com'}/dashboard/orders/${orderRow.id}`
					}),
					category: 'special_order_accepted_vendor'
				}).catch(console.error);
			}
		}
	} catch (err) {
		console.error('[reconcileSpecialOrderInstallment]', err);
	}
}
