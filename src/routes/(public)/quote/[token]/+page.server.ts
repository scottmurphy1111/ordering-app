import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { specialOrderQuotes, specialOrderRequests } from '$lib/server/db/special-orders';
import { orders } from '$lib/server/db/schema';
import { orderItems } from '$lib/server/db/orders';
import { vendor as vendorTable, vendorUsers } from '$lib/server/db/vendor';
import { user } from '$lib/server/db/auth.schema';
import { generateOrderNumber } from '$lib/server/order-number';
import type { CartItem } from '$lib/cart.svelte';
import { sendEmail } from '$lib/server/email';
import { recordNotification, shouldSendEmail } from '$lib/server/notifications';
import { specialOrderDeclinedByCustomerVendorEmail } from '$lib/server/email/templates/specialOrderDeclinedByCustomerVendor';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const vendorCtx = locals.vendor!;
	const { token } = params;

	const quote = await db.query.specialOrderQuotes.findFirst({
		where: and(
			eq(specialOrderQuotes.acceptToken, token),
			eq(specialOrderQuotes.vendorId, vendorCtx.id)
		)
	});

	if (!quote) {
		return { vendor: vendorCtx, quote: null, request: null, expired: false };
	}

	const request = await db.query.specialOrderRequests.findFirst({
		where: eq(specialOrderRequests.id, quote.requestId)
	});

	const expired = quote.expiresAt ? quote.expiresAt < new Date() : false;
	const actionParam = url.searchParams.get('action');

	return { vendor: vendorCtx, quote, request, expired, actionParam };
};

export const actions: Actions = {
	accept: async ({ params, locals }) => {
		const vendorCtx = locals.vendor!;
		const vendorId = locals.vendorId!;
		const { token } = params;

		const quote = await db.query.specialOrderQuotes.findFirst({
			where: and(
				eq(specialOrderQuotes.acceptToken, token),
				eq(specialOrderQuotes.vendorId, vendorId)
			),
			columns: {
				id: true,
				requestId: true,
				priceCents: true,
				acceptedAt: true,
				declinedAt: true,
				expiresAt: true
			}
		});

		if (!quote) return fail(404, { acceptError: 'Quote not found.' });
		if (quote.acceptedAt)
			return fail(400, { acceptError: 'You have already accepted this quote.' });
		if (quote.declinedAt) return fail(400, { acceptError: 'This quote has been declined.' });
		if (quote.expiresAt && quote.expiresAt < new Date()) {
			return fail(400, { acceptError: 'This quote has expired.' });
		}

		const requestRow = await db.query.specialOrderRequests.findFirst({
			where: eq(specialOrderRequests.id, quote.requestId),
			columns: {
				id: true,
				state: true,
				customerName: true,
				customerEmail: true,
				customerPhone: true,
				description: true,
				targetDate: true
			}
		});
		if (!requestRow) return fail(404, { acceptError: 'Request not found.' });
		if (requestRow.state === 'accepted') {
			return fail(400, { acceptError: 'This quote has already been accepted.' });
		}
		if (requestRow.state === 'declined') {
			return fail(400, { acceptError: 'This request has been declined.' });
		}

		const vendorRecord = await db.query.vendor.findFirst({
			where: eq(vendorTable.id, vendorId),
			columns: { id: true, stripeSecretKey: true, name: true }
		});
		if (!vendorRecord?.stripeSecretKey) {
			return fail(500, { acceptError: 'Payment is not configured for this shop.' });
		}

		const stripe = new Stripe(vendorRecord.stripeSecretKey);

		// Create or reuse Stripe customer scoped to this vendor
		let stripeCustomer: Stripe.Customer;
		if (requestRow.customerEmail) {
			const found = await stripe.customers.search({
				query: `email:'${requestRow.customerEmail}' AND metadata['vendorId']:'${String(vendorId)}'`,
				limit: 1
			});
			stripeCustomer =
				found.data[0] ??
				(await stripe.customers.create({
					name: requestRow.customerName ?? undefined,
					email: requestRow.customerEmail,
					phone: requestRow.customerPhone ?? undefined,
					metadata: { vendorSlug: vendorCtx.slug, vendorId: String(vendorId) }
				}));
		} else {
			stripeCustomer = await stripe.customers.create({
				name: requestRow.customerName ?? undefined,
				phone: requestRow.customerPhone ?? undefined,
				metadata: { vendorSlug: vendorCtx.slug, vendorId: String(vendorId) }
			});
		}

		// Anchor targetDate at noon UTC so it survives timezone round-trips
		const scheduledFor = requestRow.targetDate
			? new Date(`${requestRow.targetDate}T12:00:00Z`)
			: null;

		const orderNumber = await generateOrderNumber(vendorId, db);

		const [order] = await db
			.insert(orders)
			.values({
				vendorId,
				orderNumber,
				customerName: requestRow.customerName,
				customerEmail: requestRow.customerEmail,
				customerPhone: requestRow.customerPhone,
				type: 'special_order',
				status: 'received',
				paymentStatus: 'pending',
				pickupType: 'custom_date',
				pickupMode: 'custom_date',
				subtotal: quote.priceCents,
				tax: 0,
				tip: 0,
				total: quote.priceCents,
				items: [
					{
						itemId: 0,
						name: 'Custom order',
						basePrice: quote.priceCents,
						quantity: 1,
						selectedModifiers: [],
						pickupType: 'custom_date'
					} satisfies CartItem
				],
				notes: requestRow.description,
				scheduledFor,
				stripeCustomerId: stripeCustomer.id,
				specialOrderRequestId: requestRow.id
			})
			.returning();

		await db.insert(orderItems).values({
			orderId: order.id,
			catalogItemId: null,
			name: 'Custom order',
			quantity: 1,
			unitPrice: quote.priceCents,
			selectedModifiers: [],
			notes: null
		});

		const pi = await stripe.paymentIntents.create(
			{
				amount: quote.priceCents,
				currency: 'usd',
				customer: stripeCustomer.id,
				setup_future_usage: 'off_session',
				receipt_email: requestRow.customerEmail ?? undefined,
				metadata: {
					orderId: String(order.id),
					vendorSlug: vendorCtx.slug,
					orderNumber: order.orderNumber
				}
			},
			{ idempotencyKey: `pi-create:${vendorId}:quote:${token}` }
		);

		await db
			.update(orders)
			.set({ stripePaymentIntentId: pi.id, updatedAt: new Date() })
			.where(eq(orders.id, order.id));

		await db
			.update(specialOrderQuotes)
			.set({ acceptedAt: new Date() })
			.where(eq(specialOrderQuotes.id, quote.id));

		await db
			.update(specialOrderRequests)
			.set({ state: 'accepted', updatedAt: new Date() })
			.where(eq(specialOrderRequests.id, requestRow.id));

		throw redirect(303, `/checkout?orderId=${order.id}`);
	},

	decline: async ({ params, locals }) => {
		const vendorCtx = locals.vendor!;
		const { token } = params;

		const quote = await db.query.specialOrderQuotes.findFirst({
			where: and(
				eq(specialOrderQuotes.acceptToken, token),
				eq(specialOrderQuotes.vendorId, vendorCtx.id)
			),
			columns: { id: true, requestId: true, priceCents: true, acceptedAt: true, declinedAt: true }
		});

		if (!quote) return fail(404, { declineError: 'Quote not found.' });
		if (quote.acceptedAt) {
			return fail(400, { declineError: 'You have already accepted this quote.' });
		}
		if (quote.declinedAt) {
			return fail(400, { declineError: 'This quote has already been declined.' });
		}

		await db
			.update(specialOrderQuotes)
			.set({ declinedAt: new Date() })
			.where(eq(specialOrderQuotes.id, quote.id));

		await db
			.update(specialOrderRequests)
			.set({
				state: 'declined',
				declinedBy: 'customer',
				declinedAt: new Date(),
				updatedAt: new Date()
			})
			.where(eq(specialOrderRequests.id, quote.requestId));

		// Vendor notification — best-effort, does not block the response
		const vendorRow = await db.query.vendor.findFirst({
			where: eq(vendorTable.id, vendorCtx.id),
			columns: { email: true, name: true, backgroundColor: true }
		});

		let notificationEmail = vendorRow?.email ?? null;
		if (!notificationEmail) {
			const owner = await db
				.select({ email: user.email })
				.from(vendorUsers)
				.innerJoin(user, eq(user.id, vendorUsers.userId))
				.where(and(eq(vendorUsers.vendorId, vendorCtx.id), eq(vendorUsers.role, 'owner')))
				.limit(1);
			notificationEmail = owner[0]?.email ?? null;
		}

		if (vendorRow) {
			const requestRow = await db.query.specialOrderRequests.findFirst({
				where: eq(specialOrderRequests.id, quote.requestId),
				columns: {
					customerName: true,
					customerEmail: true,
					description: true,
					targetDate: true
				}
			});

			if (requestRow) {
				const origin = env.ORIGIN ?? 'https://app.getorderlocal.com';
				await recordNotification({
					vendorId: vendorCtx.id,
					category: 'special_order_declined_by_customer_vendor',
					title: 'Custom order declined',
					body: `${requestRow.customerName} declined your quote.`,
					severity: 'info',
					actionUrl: `/dashboard/special-orders/${quote.requestId}`,
					actionLabel: 'View request'
				});
				if (
					notificationEmail &&
					(await shouldSendEmail(vendorCtx.id, 'special_order_declined_by_customer_vendor'))
				) {
					sendEmail({
						to: notificationEmail,
						subject: `Quote declined by ${requestRow.customerName} — ${vendorRow.name}`,
						html: specialOrderDeclinedByCustomerVendorEmail({
							vendorName: vendorRow.name,
							primaryColor: vendorRow.backgroundColor ?? undefined,
							customerName: requestRow.customerName,
							customerEmail: requestRow.customerEmail,
							description: requestRow.description,
							targetDate: requestRow.targetDate,
							quotedPriceCents: quote.priceCents,
							requestUrl: `${origin}/dashboard/special-orders/${quote.requestId}`
						}),
						category: 'special_order_declined_by_customer_vendor'
					}).catch(console.error);
				}
			}
		}

		return { declineSuccess: true };
	}
};
