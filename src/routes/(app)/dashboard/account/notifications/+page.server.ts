import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { vendor } from '$lib/server/db/vendor';
import { vendorNotifications } from '$lib/server/db/notifications';
import { eq, and, isNull, desc } from 'drizzle-orm';

const FEED_LIMIT = 50;

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;

	const [entries, vendorRow] = await Promise.all([
		db.query.vendorNotifications.findMany({
			where: eq(vendorNotifications.vendorId, vendorId),
			orderBy: [desc(vendorNotifications.createdAt)],
			limit: FEED_LIMIT
		}),
		db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { notificationPrefs: true }
		})
	]);

	const prefs = vendorRow?.notificationPrefs ?? { emailOptOuts: [], marketingOptIn: false };

	return {
		entries,
		prefs
	};
};

export const actions: Actions = {
	savePrefs: async ({ request, locals }) => {
		const vendorId = locals.vendorId!;
		const formData = await request.formData();

		const optOutsRaw = formData.get('emailOptOuts');
		const marketingRaw = formData.get('marketingOptIn');

		let emailOptOuts: string[] = [];
		if (typeof optOutsRaw === 'string' && optOutsRaw.length > 0) {
			try {
				const parsed = JSON.parse(optOutsRaw);
				if (Array.isArray(parsed)) {
					emailOptOuts = parsed.filter((v): v is string => typeof v === 'string');
				}
			} catch {
				return fail(400, { error: 'Invalid prefs payload' });
			}
		}

		const marketingOptIn = marketingRaw === 'on' || marketingRaw === 'true';

		await db
			.update(vendor)
			.set({ notificationPrefs: { emailOptOuts, marketingOptIn } })
			.where(eq(vendor.id, vendorId));

		return { success: true };
	},

	markAllRead: async ({ locals }) => {
		const vendorId = locals.vendorId!;
		await db
			.update(vendorNotifications)
			.set({ readAt: new Date() })
			.where(and(eq(vendorNotifications.vendorId, vendorId), isNull(vendorNotifications.readAt)));
		return { success: true };
	}
};
