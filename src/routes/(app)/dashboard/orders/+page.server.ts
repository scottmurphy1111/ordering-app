import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { orders } from '$lib/server/db/schema';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals, url }) => {
	const tenantId = locals.tenantId!;
	const statusFilter = url.searchParams.get('status') ?? '';

	const whereConditions = [eq(orders.tenantId, tenantId)];
	if (statusFilter) {
		whereConditions.push(eq(orders.status, statusFilter as typeof orders.status._.data));
	}

	const allOrders = await db.query.orders.findMany({
		where: and(...whereConditions),
		orderBy: [desc(orders.createdAt)],
		limit: 50,
		columns: {
			id: true,
			orderNumber: true,
			customerName: true,
			customerPhone: true,
			total: true,
			status: true,
			paymentStatus: true,
			type: true,
			createdAt: true,
			notes: true,
			stripePaymentIntentId: true
		}
	});

	return { orders: allOrders, statusFilter };
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const status = formData.get('status')?.toString();
		if (isNaN(id) || !status) return fail(400, { error: 'Invalid' });

		await db
			.update(orders)
			.set({ status: status as typeof orders.status._.data, updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));

		return { success: true };
	},

	cancel: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		await db
			.update(orders)
			.set({ status: 'cancelled', updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));

		return { success: true };
	},

	refund: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid' });

		const order = await db.query.orders.findFirst({
			where: and(eq(orders.id, id), eq(orders.tenantId, tenantId)),
			columns: { stripePaymentIntentId: true, paymentStatus: true, status: true }
		});

		if (!order) return fail(404, { error: 'Order not found' });
		if (order.status !== 'cancelled') return fail(400, { error: 'Order must be cancelled before refunding' });
		if (order.paymentStatus !== 'paid') return fail(400, { error: 'Order has not been paid' });
		if (!order.stripePaymentIntentId) return fail(400, { error: 'No payment found for this order' });

		if (!env.STRIPE_SECRET_KEY) return fail(500, { error: 'Stripe not configured' });
		const stripe = new Stripe(env.STRIPE_SECRET_KEY);

		// stripePaymentIntentId may have been stored as a Checkout Session ID (cs_...)
		// at session creation time before the webhook resolved it to a PI ID (pi_...).
		// Resolve to the real payment intent before attempting the refund.
		let paymentIntentId = order.stripePaymentIntentId;
		if (paymentIntentId.startsWith('cs_')) {
			try {
				const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
				if (!session.payment_intent) return fail(400, { error: 'No payment intent found on this session' });
				paymentIntentId = typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent.id;
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : 'Could not resolve Stripe session';
				return fail(502, { error: msg });
			}
		}

		try {
			await stripe.refunds.create({ payment_intent: paymentIntentId });
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Stripe refund failed';
			return fail(502, { error: msg });
		}

		await db
			.update(orders)
			.set({ paymentStatus: 'refunded', updatedAt: new Date() })
			.where(eq(orders.id, id));

		return { success: true };
	}
};
