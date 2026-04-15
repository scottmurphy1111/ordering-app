import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { user, account } from '$lib/server/db/auth.schema';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Check if this user has a credential (email/password) account
	const credentialAccount = await db.query.account.findFirst({
		where: (a) => eq(a.userId, userId) && eq(a.providerId, 'credential'),
		columns: { id: true }
	});

	return {
		user: {
			name: locals.user!.name,
			email: locals.user!.email
		},
		hasPassword: !!credentialAccount
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
	},

	changePassword: async ({ request, locals }) => {
		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword')?.toString();
		const newPassword = formData.get('newPassword')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, { passwordError: 'All fields are required.' });
		}
		if (newPassword.length < 8) {
			return fail(400, { passwordError: 'New password must be at least 8 characters.' });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { passwordError: 'New passwords do not match.' });
		}

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions: false },
				headers: request.headers
			});
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Could not update password.';
			return fail(400, { passwordError: msg });
		}

		return { passwordSuccess: true };
	}
};
