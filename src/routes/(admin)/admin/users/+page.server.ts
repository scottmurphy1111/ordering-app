import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import { user as userTable } from '$lib/server/db/auth.schema';
import { session } from '$lib/server/db/schema';
import { vendorUsers } from '$lib/server/db/vendor';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isInternal) throw redirect(303, '/vendors');

	const users = await db
		.select({
			id: userTable.id,
			name: userTable.name,
			email: userTable.email,
			isInternal: userTable.isInternal,
			emailVerified: userTable.emailVerified,
			bannedAt: userTable.bannedAt,
			createdAt: userTable.createdAt,
			vendorCount: sql<number>`count(distinct ${vendorUsers.vendorId})::int`
		})
		.from(userTable)
		.leftJoin(vendorUsers, eq(vendorUsers.userId, userTable.id))
		.groupBy(userTable.id)
		.orderBy(userTable.createdAt);

	return { users };
};

export const actions: Actions = {
	toggleInternal: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const value = formData.get('value') === 'true';
		if (!id) return fail(400, { error: 'Missing id' });
		if (id === locals.user.id)
			return fail(400, { error: 'Cannot change your own internal status' });
		await db.update(userTable).set({ isInternal: value }).where(eq(userTable.id, id));
	},

	ban: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const userId = (await request.formData()).get('id')?.toString();
		if (!userId) return fail(400, { error: 'Missing id' });
		if (userId === locals.user.id) return fail(400, { error: 'Cannot ban yourself' });
		await db.update(userTable).set({ bannedAt: new Date() }).where(eq(userTable.id, userId));
		await db.delete(session).where(eq(session.userId, userId));
	},

	unban: async ({ request, locals }) => {
		if (!locals.user?.isInternal) return fail(403, { error: 'Unauthorized' });
		const userId = (await request.formData()).get('id')?.toString();
		if (!userId) return fail(400, { error: 'Missing id' });
		await db.update(userTable).set({ bannedAt: null }).where(eq(userTable.id, userId));
	}
};
