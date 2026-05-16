import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { eq, and, isNull, or, gt, notExists } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { specialOrderRequests, specialOrderQuotes } from '$lib/server/db/special-orders';
import { vendor } from '$lib/server/db/vendor';
import { sendEmail } from '$lib/server/email';
import { specialOrderQuoteExpiredEmail } from '$lib/server/email/templates/specialOrderQuoteExpired';
import { env } from '$env/dynamic/private';
import { vendorUrl } from '$lib/server/vendor-origin';

export const GET: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET;
	const authHeader = request.headers.get('Authorization') ?? '';

	if (!secret || authHeader !== `Bearer ${secret}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const now = new Date();

	// Find quoted requests where no quote is still open.
	// An open quote: acceptedAt IS NULL AND declinedAt IS NULL AND (expiresAt IS NULL OR expiresAt > now).
	// If no such quote exists, the request is stale and should expire.
	const staleRequests = await db
		.select({
			id: specialOrderRequests.id,
			vendorId: specialOrderRequests.vendorId,
			customerName: specialOrderRequests.customerName,
			customerEmail: specialOrderRequests.customerEmail
		})
		.from(specialOrderRequests)
		.where(
			and(
				eq(specialOrderRequests.state, 'quoted'),
				notExists(
					db
						.select({ _: specialOrderQuotes.id })
						.from(specialOrderQuotes)
						.where(
							and(
								eq(specialOrderQuotes.requestId, specialOrderRequests.id),
								isNull(specialOrderQuotes.acceptedAt),
								isNull(specialOrderQuotes.declinedAt),
								or(isNull(specialOrderQuotes.expiresAt), gt(specialOrderQuotes.expiresAt, now))
							)
						)
				)
			)
		);

	if (staleRequests.length === 0) {
		return json({ expired: 0 });
	}

	let expired = 0;
	const errors: string[] = [];

	for (const req of staleRequests) {
		try {
			await db
				.update(specialOrderRequests)
				.set({ state: 'expired', updatedAt: new Date() })
				.where(eq(specialOrderRequests.id, req.id));

			expired++;

			const vendorRecord = await db.query.vendor.findFirst({
				where: eq(vendor.id, req.vendorId),
				columns: { name: true, backgroundColor: true, slug: true }
			});

			if (vendorRecord) {
				const requestUrl = vendorUrl(vendorRecord.slug, '/request');

				await sendEmail({
					to: req.customerEmail,
					subject: `Your quote from ${vendorRecord.name} has expired`,
					html: specialOrderQuoteExpiredEmail({
						vendorName: vendorRecord.name,
						primaryColor: vendorRecord.backgroundColor ?? undefined,
						customerName: req.customerName,
						requestUrl
					})
				}).catch(console.error);
			}
		} catch (err) {
			errors.push(`request ${req.id}: ${String(err)}`);
		}
	}

	console.log(`[special-order-expiration] expired=${expired} errors=${errors.length}`);

	return json({ expired, errors });
};
