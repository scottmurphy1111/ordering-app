import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { user } from '$lib/server/db/auth.schema';

export const load: PageServerLoad = async ({ locals }) => {
	const userRecord = await db.query.user.findFirst({
		where: eq(user.id, locals.user!.id),
		columns: { name: true, email: true, emailVerified: true, image: true, createdAt: true }
	});

	return {
		user: {
			name: userRecord?.name ?? locals.user!.name,
			email: userRecord?.email ?? locals.user!.email,
			emailVerified: userRecord?.emailVerified ?? false,
			image: userRecord?.image ?? null,
			createdAt: userRecord?.createdAt
				? userRecord.createdAt.toISOString()
				: new Date().toISOString()
		}
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		try {
			const userId = locals.user!.id;
			const formData = await request.formData();
			const name = formData.get('name')?.toString().trim();

			if (!name) return fail(400, { error: 'Name is required.' });
			if (name.length > 100) return fail(400, { error: 'Name is too long.' });

			await db.update(user).set({ name }).where(eq(user.id, userId));
			return { profileSuccess: true };
		} catch (err) {
			console.error('[updateProfile] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	},

	removeAvatar: async ({ locals }) => {
		try {
			const userId = locals.user!.id;
			await db.update(user).set({ image: null, updatedAt: new Date() }).where(eq(user.id, userId));
			return { avatarRemoved: true };
		} catch (err) {
			console.error('[removeAvatar] error:', err);
			return fail(500, { error: 'Something went wrong on our end. Please try again.' });
		}
	}
};
