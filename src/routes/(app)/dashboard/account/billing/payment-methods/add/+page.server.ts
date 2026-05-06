import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { vendor } from '$lib/server/db/vendor';
import { requireStaff } from '$lib/server/roles';
import { getOrderLocalStripe } from '$lib/server/stripe-billing';

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	const vendorId = locals.vendorId!;

	const vendorRecord = await db.query.vendor.findFirst({
		where: eq(vendor.id, vendorId),
		columns: { stripeCustomerId: true, name: true, email: true }
	});

	let customerId = vendorRecord?.stripeCustomerId;
	const stripe = getOrderLocalStripe();

	if (!customerId) {
		const customer = await stripe.customers.create({
			name: vendorRecord?.name ?? undefined,
			email: vendorRecord?.email ?? undefined,
			metadata: { vendorId: String(vendorId) }
		});
		customerId = customer.id;
		await db
			.update(vendor)
			.set({ stripeCustomerId: customerId, updatedAt: new Date() })
			.where(eq(vendor.id, vendorId));
	}

	const setupIntent = await stripe.setupIntents.create({
		customer: customerId,
		payment_method_types: ['card'],
		usage: 'off_session'
	});

	if (!setupIntent.client_secret) {
		redirect(303, '/dashboard/account/billing/payment-methods');
	}

	return {
		clientSecret: setupIntent.client_secret,
		publishableKey: env.ORDERLOCAL_STRIPE_PUBLISHABLE_KEY ?? env.STRIPE_PUBLISHABLE_KEY ?? ''
	};
};
