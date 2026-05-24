import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { specialOrderRequests, specialOrderQuotes } from '$lib/server/db/special-orders';
import { orders } from '$lib/server/db/schema';
import { requireStaff } from '$lib/server/roles';
import { sendEmail } from '$lib/server/email';
import { specialOrderQuoteSentEmail } from '$lib/server/email/templates/specialOrderQuoteSent';
import { vendorUrl } from '$lib/server/vendor-origin';

function generateToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export const load: PageServerLoad = async ({ params, locals }) => {
	requireStaff(locals);
	const vendorId = locals.vendorId!;
	const id = Number(params.id);
	if (!id) error(404, 'Not found');

	const request = await db.query.specialOrderRequests.findFirst({
		where: and(eq(specialOrderRequests.id, id), eq(specialOrderRequests.vendorId, vendorId))
	});
	if (!request) error(404, 'Request not found');

	const quotes = await db
		.select()
		.from(specialOrderQuotes)
		.where(and(eq(specialOrderQuotes.requestId, id), eq(specialOrderQuotes.vendorId, vendorId)))
		.orderBy(desc(specialOrderQuotes.createdAt));

	const linkedOrder =
		request.state === 'accepted'
			? await db.query.orders.findFirst({
					where: and(eq(orders.specialOrderRequestId, id), eq(orders.vendorId, vendorId)),
					columns: {
						id: true,
						orderNumber: true,
						status: true,
						paymentStatus: true,
						total: true,
						createdAt: true
					}
				})
			: null;

	return { request, quotes, linkedOrder };
};

export const actions: Actions = {
	sendQuote: async ({ request: req, params, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const id = Number(params.id);

		const formData = await req.formData();
		const priceRaw = formData.get('priceCents')?.toString().trim();
		const message = formData.get('message')?.toString().trim() || null;

		if (!priceRaw || isNaN(Number(priceRaw)) || Number(priceRaw) <= 0) {
			return fail(400, { sendError: 'A valid price is required.' });
		}
		const priceCents = Math.round(Number(priceRaw));

		const existing = await db.query.specialOrderRequests.findFirst({
			where: and(eq(specialOrderRequests.id, id), eq(specialOrderRequests.vendorId, vendorId)),
			columns: { id: true, state: true, customerEmail: true, customerName: true }
		});
		if (!existing) return fail(404, { sendError: 'Request not found.' });
		if (existing.state === 'declined') {
			return fail(400, { sendError: 'Cannot send a quote for a declined request.' });
		}

		const token = generateToken();
		const vendorSlug = locals.vendor!.slug;

		const [quote] = await db
			.insert(specialOrderQuotes)
			.values({
				requestId: id,
				vendorId,
				priceCents,
				message,
				acceptToken: token,
				sentByUserId: locals.user?.id ?? null
			})
			.returning();

		await db
			.update(specialOrderRequests)
			.set({ state: 'quoted', updatedAt: new Date() })
			.where(and(eq(specialOrderRequests.id, id), eq(specialOrderRequests.vendorId, vendorId)));

		const vendor = locals.vendor!;
		const acceptUrl = vendorUrl(vendorSlug, `/quote/${token}`);
		const declineUrl = `${vendorUrl(vendorSlug, `/quote/${token}`)}?action=decline`;

		try {
			const html = specialOrderQuoteSentEmail({
				vendorName: vendor.name,
				primaryColor: vendor.backgroundColor ?? undefined,
				customerName: existing.customerName,
				priceCents: quote.priceCents,
				message: quote.message,
				acceptUrl,
				declineUrl
			});
			await sendEmail({
				to: existing.customerEmail,
				subject: `Quote from ${vendor.name}`,
				html,
				fromName: vendor.name,
				replyTo: vendor.email ?? undefined,
				category: 'special_order_quote_sent'
			});
		} catch {
			// best-effort; don't fail the action if email fails
		}

		return { sendSuccess: true, quoteId: quote.id };
	},

	decline: async ({ request: req, params, locals }) => {
		requireStaff(locals);
		const vendorId = locals.vendorId!;
		const id = Number(params.id);

		const formData = await req.formData();
		const reason = formData.get('reason')?.toString().trim() || null;

		const existing = await db.query.specialOrderRequests.findFirst({
			where: and(eq(specialOrderRequests.id, id), eq(specialOrderRequests.vendorId, vendorId)),
			columns: { id: true, state: true }
		});
		if (!existing) return fail(404, { declineError: 'Request not found.' });
		if (existing.state !== 'pending' && existing.state !== 'quoted') {
			return fail(400, { declineError: 'This request cannot be declined.' });
		}

		await db
			.update(specialOrderRequests)
			.set({
				state: 'declined',
				declinedReason: reason,
				declinedBy: 'vendor',
				declinedAt: new Date(),
				updatedAt: new Date()
			})
			.where(and(eq(specialOrderRequests.id, id), eq(specialOrderRequests.vendorId, vendorId)));

		return { declineSuccess: true };
	}
};
