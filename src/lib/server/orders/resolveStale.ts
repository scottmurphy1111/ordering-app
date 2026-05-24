import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { pickupWindows } from '$lib/server/db/pickup';
import { vendor } from '$lib/server/db/vendor';
import { sendEmail } from '$lib/server/email';
import { orderCancelledEmail } from '$lib/server/email/templates/orderCancelled';
import { and, eq, lt, inArray, isNotNull, isNull } from 'drizzle-orm';

const STALE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const VENDOR_STALL_DAYS = 14;
const CUSTOMER_STALL_DAYS = 30;

const NON_TERMINAL_STATUSES = ['received', 'confirmed', 'preparing', 'ready', 'scheduled'] as const;

/**
 * Auto-resolves stuck orders. Three flavors:
 *
 * 1. Stale window-bound orders (window ended > 7 days ago):
 *    - paid → fulfilled (customer presumably picked up; vendor forgot to mark)
 *    - pending → cancelled + void (customer never completed payment)
 *    - failed → cancelled (payment failure preserved as paymentStatus history)
 *
 * 2. Vendor-stalled pending_approval (createdAt > 14 days ago, proposedAt IS NULL):
 *    cancelled + void. Customer emailed an expired-request explanation.
 *
 * 3. Customer-stalled proposal (proposedAt > 30 days ago):
 *    cancelled + void, proposal fields cleared. Customer emailed an expired-proposal
 *    explanation.
 *
 * Free-form scheduledFor orders (no pickup window) are not affected by branch 1
 * but ARE eligible for branches 2 and 3.
 *
 * Returns the total count of resolved orders across all branches. Errors are caught
 * and logged; the function never throws (auto-resolve is best-effort cleanup, not
 * correctness-critical).
 */
export async function resolveStaleOrders(vendorId: number): Promise<number> {
	const cutoff = new Date(Date.now() - STALE_GRACE_MS);

	try {
		// Subquery: pickup windows that ended before the cutoff.
		const staleWindowIds = db
			.select({ id: pickupWindows.id })
			.from(pickupWindows)
			.where(lt(pickupWindows.endsAt, cutoff));

		// Branch 1: paid stale orders → fulfilled.
		const fulfilledRows = await db
			.update(orders)
			.set({ status: 'fulfilled', updatedAt: new Date() })
			.where(
				and(
					eq(orders.vendorId, vendorId),
					isNotNull(orders.pickupWindowId),
					inArray(orders.pickupWindowId, staleWindowIds),
					inArray(orders.status, NON_TERMINAL_STATUSES),
					eq(orders.paymentStatus, 'paid')
				)
			)
			.returning({ id: orders.id });

		// Branch 2a: pending stale orders → cancelled + void (never charged).
		const cancelledPendingRows = await db
			.update(orders)
			.set({ status: 'cancelled', paymentStatus: 'void', updatedAt: new Date() })
			.where(
				and(
					eq(orders.vendorId, vendorId),
					isNotNull(orders.pickupWindowId),
					inArray(orders.pickupWindowId, staleWindowIds),
					inArray(orders.status, NON_TERMINAL_STATUSES),
					eq(orders.paymentStatus, 'pending')
				)
			)
			.returning({ id: orders.id });

		// Branch 2b: failed stale orders → cancelled (paymentStatus stays 'failed' to preserve history).
		const cancelledFailedRows = await db
			.update(orders)
			.set({ status: 'cancelled', updatedAt: new Date() })
			.where(
				and(
					eq(orders.vendorId, vendorId),
					isNotNull(orders.pickupWindowId),
					inArray(orders.pickupWindowId, staleWindowIds),
					inArray(orders.status, NON_TERMINAL_STATUSES),
					eq(orders.paymentStatus, 'failed')
				)
			)
			.returning({ id: orders.id });

		const cancelledRows = [...cancelledPendingRows, ...cancelledFailedRows];

		// Branch C: pending_approval orders the vendor never acted on → cancelled + void.
		// "Vendor stalled" = proposedAt IS NULL and createdAt > 14 days ago.
		const vendorStallCutoff = new Date(Date.now() - VENDOR_STALL_DAYS * 86_400_000);

		const vendorStalledOrders = await db.query.orders.findMany({
			where: and(
				eq(orders.vendorId, vendorId),
				eq(orders.status, 'pending_approval'),
				isNull(orders.proposedAt),
				lt(orders.createdAt, vendorStallCutoff)
			),
			columns: {
				id: true,
				orderNumber: true,
				customerName: true,
				customerEmail: true,
				total: true
			}
		});

		let vendorStalledCount = 0;
		if (vendorStalledOrders.length > 0) {
			await db
				.update(orders)
				.set({ status: 'cancelled', paymentStatus: 'void', updatedAt: new Date() })
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.status, 'pending_approval'),
						isNull(orders.proposedAt),
						lt(orders.createdAt, vendorStallCutoff)
					)
				);
			vendorStalledCount = vendorStalledOrders.length;

			const vendorRecordC = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, email: true, backgroundColor: true, subscriptionTier: true }
			});
			if (vendorRecordC) {
				for (const o of vendorStalledOrders) {
					if (!o.customerEmail) continue;
					sendEmail({
						to: o.customerEmail,
						subject: `Order ${o.orderNumber} cancelled — ${vendorRecordC.name}`,
						html: orderCancelledEmail({
							vendorName: vendorRecordC.name,
							primaryColor: vendorRecordC.backgroundColor ?? undefined,
							vendorSubscriptionTier: vendorRecordC.subscriptionTier ?? undefined,
							orderNumber: o.orderNumber,
							customerName: o.customerName ?? 'there',
							total: o.total,
							reason: `Your custom-date order request expired after ${VENDOR_STALL_DAYS} days without a response from the vendor. You were not charged.`
						}),
						fromName: vendorRecordC.name,
						replyTo: vendorRecordC.email ?? undefined,
						category: 'order_cancelled'
					}).catch(console.error);
				}
			}
		}

		// Branch D: pending_approval orders with active proposals the customer never acted on → cancelled + void.
		// "Customer stalled on proposal" = proposedAt IS NOT NULL and proposedAt > 30 days ago.
		const customerStallCutoff = new Date(Date.now() - CUSTOMER_STALL_DAYS * 86_400_000);

		const customerStalledOrders = await db.query.orders.findMany({
			where: and(
				eq(orders.vendorId, vendorId),
				eq(orders.status, 'pending_approval'),
				isNotNull(orders.proposedAt),
				lt(orders.proposedAt, customerStallCutoff)
			),
			columns: {
				id: true,
				orderNumber: true,
				customerName: true,
				customerEmail: true,
				total: true
			}
		});

		let customerStalledCount = 0;
		if (customerStalledOrders.length > 0) {
			await db
				.update(orders)
				.set({
					status: 'cancelled',
					paymentStatus: 'void',
					proposedDate: null,
					proposedReason: null,
					proposedAt: null,
					updatedAt: new Date()
				})
				.where(
					and(
						eq(orders.vendorId, vendorId),
						eq(orders.status, 'pending_approval'),
						isNotNull(orders.proposedAt),
						lt(orders.proposedAt, customerStallCutoff)
					)
				);
			customerStalledCount = customerStalledOrders.length;

			const vendorRecordD = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, email: true, backgroundColor: true, subscriptionTier: true }
			});
			if (vendorRecordD) {
				for (const o of customerStalledOrders) {
					if (!o.customerEmail) continue;
					sendEmail({
						to: o.customerEmail,
						subject: `Order ${o.orderNumber} cancelled — ${vendorRecordD.name}`,
						html: orderCancelledEmail({
							vendorName: vendorRecordD.name,
							primaryColor: vendorRecordD.backgroundColor ?? undefined,
							vendorSubscriptionTier: vendorRecordD.subscriptionTier ?? undefined,
							orderNumber: o.orderNumber,
							customerName: o.customerName ?? 'there',
							total: o.total,
							reason: `The proposed alternate date for your order expired after ${CUSTOMER_STALL_DAYS} days without a response. You were not charged.`
						}),
						fromName: vendorRecordD.name,
						replyTo: vendorRecordD.email ?? undefined,
						category: 'order_cancelled'
					}).catch(console.error);
				}
			}
		}

		const total =
			fulfilledRows.length + cancelledRows.length + vendorStalledCount + customerStalledCount;
		if (total > 0) {
			console.log(
				`[auto-resolve] vendor ${vendorId}: ${fulfilledRows.length} → fulfilled, ${cancelledRows.length} → window-cancelled, ${vendorStalledCount} → vendor-stalled, ${customerStalledCount} → customer-stalled`
			);
		}
		return total;
	} catch (err) {
		console.error('[auto-resolve] failed:', err);
		return 0;
	}
}
