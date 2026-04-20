import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { user } from '$lib/server/db/auth.schema';

export const load: PageServerLoad = ({ locals }) => {
	return {
		user: {
			name: locals.user!.name,
			email: locals.user!.email
		}
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();

		if (!name) return fail(400, { profileError: 'Name is required.' });
		if (name.length > 100) return fail(400, { profileError: 'Name is too long.' });

		await db.update(user).set({ name }).where(eq(user.id, userId));
		return { profileSuccess: true };
	}
};
