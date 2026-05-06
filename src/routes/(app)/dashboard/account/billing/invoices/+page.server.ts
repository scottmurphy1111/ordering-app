import type { PageServerLoad } from './$types';
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
		columns: { stripeCustomerId: true }
	});

	if (!vendorRecord?.stripeCustomerId) {
		return { invoices: [], hasStripeCustomer: false, hasMore: false };
	}

	const stripe = getOrderLocalStripe();
	const list = await stripe.invoices.list({
		customer: vendorRecord.stripeCustomerId,
		limit: 24
	});

	const invoices = list.data.map((inv) => ({
		id: inv.id,
		number: inv.number,
		created: inv.created,
		status: inv.status ?? 'draft',
		total: inv.total,
		currency: inv.currency,
		hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
		invoicePdf: inv.invoice_pdf ?? null
	}));

	return { invoices, hasStripeCustomer: true, hasMore: list.has_more };
};
