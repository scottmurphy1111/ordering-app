import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { orders, orderItems } from '$lib/server/db/schema';
import { vendor } from '$lib/server/db/vendor';
import Stripe from 'stripe';
import { sendEmail } from '$lib/server/email';
import { vendorUrl } from '$lib/server/vendor-origin';
import { orderReadyEmail } from '$lib/server/email/templates/orderReady';
import { orderCancelledEmail } from '$lib/server/email/templates/orderCancelled';
import { orderRefundedEmail } from '$lib/server/email/templates/orderRefunded';
import { customDateOrderApprovedEmail } from '$lib/server/email/templates/customDateOrderApproved';
import { customDatePaymentFailedEmail } from '$lib/server/email/templates/customDatePaymentFailed';
import { alternateDateProposedEmail } from '$lib/server/email/templates/alternateDateProposed';
import { sendSms } from '$lib/server/sms';
import { reconcilePaymentStatus } from '$lib/server/orders/reconcilePaymentStatus';

export const load: PageServerLoad = async ({ locals, params }) => {
	const vendorId = locals.vendorId!;
	const orderId = parseInt(params.orderId);
	if (isNaN(orderId)) throw error(404, 'Order not found');

	let order = await db.query.orders.findFirst({
		where: and(eq(orders.id, orderId), eq(orders.vendorId, vendorId))
	});

	if (!order) throw error(404, 'Order not found');

	order = await reconcilePaymentStatus(order, vendorId);

	return { order };
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const status = formData.get('status')?.toString();
		if (isNaN(id) || !status) return fail(400, { error: 'Invalid' });

		const [order] = await db
			.update(orders)
			.set({ status: status as typeof orders.status._.data, updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)))
			.returning();

		if (status === 'ready' && (order?.customerEmail || order?.customerPhone)) {
			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true, slug: true }
			});
			if (vendorRecord) {
				if (order.customerEmail) {
					await sendEmail({
						to: order.customerEmail,
						subject: `Your order is ready — ${vendorRecord.name}`,
						html: orderReadyEmail({
							vendorName: vendorRecord.name,
							primaryColor: vendorRecord.backgroundColor ?? undefined,
							orderNumber: order.orderNumber,
							customerName: order.customerName ?? 'there',
							total: order.total,
							orderType: order.type
						})
					}).catch(console.error);
				}
				if (order.customerPhone) {
					await sendSms(
						order.customerPhone,
						`${vendorRecord.name}: Your order ${order.orderNumber} is ready for pickup!`
					).catch(console.error);
				}
			}
		}

		return { success: true };
	},

	cancel: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const existing = await db.query.orders.findFirst({
			where: and(eq(orders.id, id), eq(orders.vendorId, vendorId)),
			columns: { paymentStatus: true }
		});
		if (!existing) return fail(404, { error: 'Order not found' });

		const nextPaymentStatus = existing.paymentStatus === 'pending' ? 'void' : existing.paymentStatus;

		const [order] = await db
			.update(orders)
			.set({ status: 'cancelled', paymentStatus: nextPaymentStatus, updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)))
			.returning();

		if (order?.customerEmail || order?.customerPhone) {
			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true, slug: true }
			});
			if (vendorRecord) {
				if (order.customerEmail) {
					await sendEmail({
						to: order.customerEmail,
						subject: `Order ${order.orderNumber} cancelled — ${vendorRecord.name}`,
						html: orderCancelledEmail({
							vendorName: vendorRecord.name,
							primaryColor: vendorRecord.backgroundColor ?? undefined,
							orderNumber: order.orderNumber,
							customerName: order.customerName ?? 'there',
							total: order.total
						})
					}).catch(console.error);
				}
				if (order.customerPhone) {
					await sendSms(
						order.customerPhone,
						`${vendorRecord.name}: Your order ${order.orderNumber} has been cancelled.`
					).catch(console.error);
				}
			}
		}

		return { success: true };
	},

	refund: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const [orderRow, vendorRecord] = await Promise.all([
			db.query.orders.findFirst({
				where: and(eq(orders.id, id), eq(orders.vendorId, vendorId))
			}),
			db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { stripeSecretKey: true, name: true, backgroundColor: true }
			})
		]);

		if (!orderRow) return fail(404, { error: 'Order not found' });
		if (orderRow.status !== 'cancelled')
			return fail(400, { error: 'Order must be cancelled before refunding' });
		if (orderRow.paymentStatus !== 'paid') return fail(400, { error: 'Order has not been paid' });
		if (!orderRow.stripePaymentIntentId)
			return fail(400, { error: 'No payment found for this order' });
		if (!vendorRecord?.stripeSecretKey)
			return fail(500, { error: 'Stripe not configured for this vendor' });

		const stripe = new Stripe(vendorRecord.stripeSecretKey);

		let paymentIntentId = orderRow.stripePaymentIntentId;
		if (paymentIntentId.startsWith('cs_')) {
			try {
				const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
				if (!session.payment_intent)
					return fail(400, { error: 'No payment intent found on this session' });
				paymentIntentId =
					typeof session.payment_intent === 'string'
						? session.payment_intent
						: session.payment_intent.id;
			} catch (e: unknown) {
				return fail(502, {
					error: e instanceof Error ? e.message : 'Could not resolve Stripe session'
				});
			}
		}

		try {
			await stripe.refunds.create(
				{ payment_intent: paymentIntentId },
				{ idempotencyKey: `refund:${vendorId}:order:${paymentIntentId}` }
			);
		} catch (e: unknown) {
			return fail(502, { error: e instanceof Error ? e.message : 'Stripe refund failed' });
		}

		const [refundedOrder] = await db
			.update(orders)
			.set({ paymentStatus: 'refunded', updatedAt: new Date() })
			.where(eq(orders.id, id))
			.returning();

		if (refundedOrder?.customerEmail && vendorRecord) {
			await sendEmail({
				to: refundedOrder.customerEmail,
				subject: `Refund processed for order ${refundedOrder.orderNumber} — ${vendorRecord.name}`,
				html: orderRefundedEmail({
					vendorName: vendorRecord.name,
					primaryColor: vendorRecord.backgroundColor ?? undefined,
					orderNumber: refundedOrder.orderNumber,
					customerName: refundedOrder.customerName ?? 'there',
					total: refundedOrder.total
				})
			}).catch(console.error);
		}

		return { success: true };
	},

	approve: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const [orderRow, vendorRecord] = await Promise.all([
			db.query.orders.findFirst({
				where: and(eq(orders.id, id), eq(orders.vendorId, vendorId))
			}),
			db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: {
					stripeSecretKey: true,
					name: true,
					backgroundColor: true,
					slug: true,
					timezone: true
				}
			})
		]);

		if (!orderRow) return fail(404, { error: 'Order not found' });
		if (orderRow.status !== 'pending_approval')
			return fail(400, { error: 'Order is not pending approval' });
		if (orderRow.proposedAt !== null)
			return fail(400, {
				error: 'A date proposal is pending — withdraw it or wait for the customer to respond'
			});
		if (!orderRow.stripeSetupIntentId)
			return fail(400, { error: 'Order is missing payment setup data' });
		if (!vendorRecord?.stripeSecretKey)
			return fail(500, { error: 'Stripe not configured for this vendor' });

		const stripe = new Stripe(vendorRecord.stripeSecretKey);

		let paymentMethodId: string;
		try {
			const setupIntent = await stripe.setupIntents.retrieve(orderRow.stripeSetupIntentId);
			if (!setupIntent.payment_method)
				return fail(400, { error: 'No payment method saved for this order' });
			paymentMethodId =
				typeof setupIntent.payment_method === 'string'
					? setupIntent.payment_method
					: setupIntent.payment_method.id;
		} catch (e: unknown) {
			return fail(502, {
				error: e instanceof Error ? e.message : 'Could not retrieve saved payment method'
			});
		}

		try {
			const pi = await stripe.paymentIntents.create(
				{
					amount: orderRow.total,
					currency: 'usd',
					...(orderRow.stripeCustomerId ? { customer: orderRow.stripeCustomerId } : {}),
					payment_method: paymentMethodId,
					off_session: true,
					confirm: true,
					...(orderRow.customerEmail ? { receipt_email: orderRow.customerEmail } : {}),
					metadata: {
						orderId: String(orderRow.id),
						vendorSlug: vendorRecord.slug ?? '',
						orderNumber: orderRow.orderNumber
					}
				},
				{ idempotencyKey: `pi-create:${vendorId}:${orderRow.id}:dashboard` }
			);

			await db
				.update(orders)
				.set({
					status: 'received',
					paymentStatus: 'paid',
					stripePaymentIntentId: pi.id,
					stripePaymentMethodId: paymentMethodId,
					updatedAt: new Date()
				})
				.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)));

			if (orderRow.customerEmail || orderRow.customerPhone) {
				const approvedItems = await db.query.orderItems.findMany({
					where: eq(orderItems.orderId, orderRow.id)
				});
				const snapshotItems =
					(orderRow.items as Array<{
						name: string;
						quantity: number;
						basePrice: number;
						selectedModifiers?: Array<{ name: string; priceAdjustment: number }>;
					}>) ?? [];
				const emailItems =
					snapshotItems.length > 0
						? snapshotItems
						: approvedItems.map((i) => ({
								name: i.name,
								quantity: i.quantity,
								basePrice: i.unitPrice,
								selectedModifiers: []
							}));
				if (orderRow.customerEmail) {
					await sendEmail({
						to: orderRow.customerEmail,
						subject: `Order ${orderRow.orderNumber} approved — ${vendorRecord.name}`,
						html: customDateOrderApprovedEmail({
							vendorName: vendorRecord.name,
							primaryColor: vendorRecord.backgroundColor ?? undefined,
							orderNumber: orderRow.orderNumber,
							customerName: orderRow.customerName ?? 'there',
							items: emailItems,
							subtotal: orderRow.subtotal,
							tax: orderRow.tax,
							tip: orderRow.tip ?? 0,
							total: orderRow.total,
							scheduledFor: orderRow.scheduledFor,
							vendorTimezone: vendorRecord.timezone ?? 'America/New_York',
							orderStatusUrl: vendorUrl(vendorRecord.slug, `/orders/${orderRow.id}`)
						})
					}).catch(console.error);
				}
				if (orderRow.customerPhone) {
					await sendSms(
						orderRow.customerPhone,
						`${vendorRecord.name}: Your order ${orderRow.orderNumber} has been approved and payment processed!`
					).catch(console.error);
				}
			}
		} catch (e: unknown) {
			const stripeError = e as { payment_intent?: { id: string } };
			const failedIntentId = stripeError.payment_intent?.id ?? null;

			await db
				.update(orders)
				.set({
					status: 'payment_failed',
					paymentStatus: 'failed',
					stripePaymentIntentId: failedIntentId,
					stripePaymentMethodId: paymentMethodId,
					updatedAt: new Date()
				})
				.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)));

			if (orderRow.customerEmail) {
				await sendEmail({
					to: orderRow.customerEmail,
					subject: `Payment issue — order ${orderRow.orderNumber} — ${vendorRecord.name}`,
					html: customDatePaymentFailedEmail({
						vendorName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						orderNumber: orderRow.orderNumber,
						customerName: orderRow.customerName ?? 'there',
						total: orderRow.total,
						recoveryUrl: vendorUrl(vendorRecord.slug, `/orders/${orderRow.id}`)
					})
				}).catch(console.error);
			}
			return fail(502, {
				error: e instanceof Error ? e.message : 'Payment charge failed'
			});
		}

		return { success: true };
	},

	decline: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const existing = await db.query.orders.findFirst({
			where: and(eq(orders.id, id), eq(orders.vendorId, vendorId))
		});
		if (!existing) return fail(404, { error: 'Order not found' });
		if (existing.proposedAt !== null)
			return fail(400, {
				error: 'A date proposal is pending — withdraw it or wait for the customer to respond'
			});

		const [order] = await db
			.update(orders)
			.set({ status: 'cancelled', paymentStatus: 'void', updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)))
			.returning();

		if (order?.customerEmail || order?.customerPhone) {
			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true, slug: true }
			});
			if (vendorRecord) {
				if (order.customerEmail) {
					await sendEmail({
						to: order.customerEmail,
						subject: `Order request ${order.orderNumber} declined — ${vendorRecord.name}`,
						html: orderCancelledEmail({
							vendorName: vendorRecord.name,
							primaryColor: vendorRecord.backgroundColor ?? undefined,
							orderNumber: order.orderNumber,
							customerName: order.customerName ?? 'there',
							total: order.total
						})
					}).catch(console.error);
				}
				if (order.customerPhone) {
					await sendSms(
						order.customerPhone,
						`${vendorRecord.name}: Your order request ${order.orderNumber} was not approved.`
					).catch(console.error);
				}
			}
		}

		return { success: true };
	},

	proposeAlternate: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const dateStr = formData.get('date')?.toString() ?? '';
		const reason = formData.get('reason')?.toString()?.trim() || null;
		if (isNaN(id) || !dateStr) return fail(400, { error: 'Invalid' });

		const proposedDate = new Date(dateStr + 'T12:00:00Z');
		if (isNaN(proposedDate.getTime())) return fail(400, { error: 'Invalid date' });
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		if (proposedDate < todayStart) return fail(400, { error: 'Proposed date must be today or later' });
		const oneYearOut = new Date(todayStart);
		oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
		if (proposedDate > oneYearOut) return fail(400, { error: 'Proposed date must be within one year' });

		const [orderRow, vendorRecord] = await Promise.all([
			db.query.orders.findFirst({
				where: and(eq(orders.id, id), eq(orders.vendorId, vendorId))
			}),
			db.query.vendor.findFirst({
				where: eq(vendor.id, vendorId),
				columns: { name: true, backgroundColor: true, slug: true, timezone: true }
			})
		]);

		if (!orderRow) return fail(404, { error: 'Order not found' });
		if (orderRow.status !== 'pending_approval') return fail(400, { error: 'Order is not pending approval' });
		if (orderRow.proposedAt !== null) return fail(400, { error: 'A proposal is already pending' });

		await db
			.update(orders)
			.set({ proposedDate, proposedReason: reason, proposedAt: new Date(), updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)));

		if (orderRow.customerEmail && vendorRecord) {
			await sendEmail({
				to: orderRow.customerEmail,
				subject: `Date change proposed for order ${orderRow.orderNumber} — ${vendorRecord.name}`,
				html: alternateDateProposedEmail({
					vendorName: vendorRecord.name,
					primaryColor: vendorRecord.backgroundColor ?? undefined,
					orderNumber: orderRow.orderNumber,
					customerName: orderRow.customerName ?? 'there',
					total: orderRow.total,
					originalDate: orderRow.scheduledFor,
					proposedDate,
					proposedReason: reason,
					vendorTimezone: vendorRecord.timezone ?? 'America/New_York',
					orderStatusUrl: vendorUrl(vendorRecord.slug, `/orders/${orderRow.id}`)
				})
			}).catch(console.error);
		}
		if (orderRow.customerPhone && vendorRecord) {
			await sendSms(
				orderRow.customerPhone,
				`${vendorRecord.name}: We've proposed a new date for order ${orderRow.orderNumber}. Please check your order page.`
			).catch(console.error);
		}

		return { success: true };
	},

	withdrawProposal: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const existing = await db.query.orders.findFirst({
			where: and(eq(orders.id, id), eq(orders.vendorId, vendorId))
		});
		if (!existing) return fail(404, { error: 'Order not found' });
		if (existing.status !== 'pending_approval') return fail(400, { error: 'Order is not pending approval' });
		if (existing.proposedAt === null) return fail(400, { error: 'No proposal to withdraw' });

		await db
			.update(orders)
			.set({ proposedDate: null, proposedReason: null, proposedAt: null, updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.vendorId, vendorId)));

		return { success: true };
	}
};
