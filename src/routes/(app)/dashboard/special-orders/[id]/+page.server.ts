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
import { generateToken } from '$lib/server/tokens';

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
		try {
			requireStaff(locals);
			const vendorId = locals.vendorId!;
			const id = Number(params.id);

			const formData = await req.formData();
			const priceRaw = formData.get('priceCents')?.toString().trim();
			const message = formData.get('message')?.toString().trim() || null;

			if (!priceRaw || isNaN(Number(priceRaw)) || Number(priceRaw) <= 0) {
				return fail(400, { error: 'A valid price is required.' });
			}
			const priceCents = Math.round(Number(priceRaw));

			// Optional deposit. If set, it must be a positive amount strictly less than
			// the full price, and a future balance-due date is required.
			const depositRaw = formData.get('depositCents')?.toString().trim();
			const balanceDueRaw = formData.get('balanceDueAt')?.toString().trim();
			let depositCents: number | null = null;
			let balanceDueAt: Date | null = null;
			if (depositRaw) {
				const dep = Math.round(Number(depositRaw));
				if (isNaN(dep) || dep <= 0 || dep >= priceCents) {
					return fail(400, {
						error: 'Deposit must be greater than $0 and less than the total price.'
					});
				}
				if (!balanceDueRaw) {
					return fail(400, { error: 'A balance due date is required when a deposit is set.' });
				}
				// Noon-UTC anchor so the calendar day survives timezone round-trips.
				const due = new Date(`${balanceDueRaw}T12:00:00Z`);
				if (isNaN(due.getTime()) || due.getTime() <= Date.now()) {
					return fail(400, { error: 'Balance due date must be in the future.' });
				}
				depositCents = dep;
				balanceDueAt = due;
			}

			const existing = await db.query.specialOrderRequests.findFirst({
				where: and(eq(specialOrderRequests.id, id), eq(specialOrderRequests.vendorId, vendorId)),
				columns: {
					id: true,
					state: true,
					customerEmail: true,
					customerName: true,
					targetDate: true
				}
			});
			if (!existing) return fail(404, { error: 'Request not found.' });

			// A balance due date can't fall after the event/target date — the balance
			// must be collected on or before the event. Compare calendar days (the raw
			// YYYY-MM-DD input vs the target's UTC day) to avoid the noon-anchor edge.
			if (balanceDueAt && balanceDueRaw && existing.targetDate) {
				const targetDay = new Date(existing.targetDate).toISOString().slice(0, 10);
				if (balanceDueRaw > targetDay) {
					const friendly = new Date(`${targetDay}T12:00:00Z`).toLocaleDateString('en-US', {
						month: 'long',
						day: 'numeric',
						year: 'numeric',
						timeZone: 'UTC'
					});
					return fail(400, {
						error: `Balance due date can't be after the event date (${friendly}).`
					});
				}
			}
			if (existing.state === 'declined') {
				return fail(400, { error: 'Cannot send a quote for a declined request.' });
			}

			const token = generateToken();
			const vendorSlug = locals.vendor!.slug;

			const [quote] = await db
				.insert(specialOrderQuotes)
				.values({
					requestId: id,
					vendorId,
					priceCents,
					depositCents,
					balanceDueAt,
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
					vendorSubscriptionTier: vendor.subscriptionTier ?? undefined,
					customerName: existing.customerName,
					priceCents: quote.priceCents,
					...(depositCents
						? { depositCents, balanceCents: priceCents - depositCents, balanceDueAt }
						: {}),
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
		} catch (err) {
			console.error('[sendQuote] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	},

	decline: async ({ request: req, params, locals }) => {
		try {
			requireStaff(locals);
			const vendorId = locals.vendorId!;
			const id = Number(params.id);

			const formData = await req.formData();
			const reason = formData.get('reason')?.toString().trim() || null;

			const existing = await db.query.specialOrderRequests.findFirst({
				where: and(eq(specialOrderRequests.id, id), eq(specialOrderRequests.vendorId, vendorId)),
				columns: { id: true, state: true }
			});
			if (!existing) return fail(404, { error: 'Request not found.' });
			if (existing.state !== 'pending' && existing.state !== 'quoted') {
				return fail(400, { error: 'This request cannot be declined.' });
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
		} catch (err) {
			console.error('[decline] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	}
};
