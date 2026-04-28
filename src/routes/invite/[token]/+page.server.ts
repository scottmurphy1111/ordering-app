import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { vendorUsers, vendorInvitations, vendor } from '$lib/server/db/vendor';
import { user } from '$lib/server/db/auth.schema';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

async function acceptInvite(token: string, userId: string) {
	const invite = await db.query.vendorInvitations.findFirst({
		where: eq(vendorInvitations.id, token)
	});
	if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return false;

	const existing = await db.query.vendorUsers.findFirst({
		where: and(eq(vendorUsers.vendorId, invite.vendorId), eq(vendorUsers.userId, userId))
	});
	if (!existing) {
		await db.insert(vendorUsers).values({
			vendorId: invite.vendorId,
			userId,
			role: invite.role as 'owner' | 'manager' | 'kitchen' | 'staff' | 'viewer'
		});
	}

	await db
		.update(vendorInvitations)
		.set({ acceptedAt: new Date() })
		.where(eq(vendorInvitations.id, token));

	return true;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { token } = params;

	const invite = await db.query.vendorInvitations.findFirst({
		where: eq(vendorInvitations.id, token)
	});

	if (!invite) return { invalid: true };
	if (invite.acceptedAt) return { alreadyAccepted: true };
	if (invite.expiresAt < new Date()) return { expired: true };

	const vendorRecord = await db.query.vendor.findFirst({
		where: eq(vendor.id, invite.vendorId)
	});

	if (locals.user) {
		if (locals.user.email.toLowerCase() !== invite.email.toLowerCase()) {
			return {
				invite: { email: invite.email, role: invite.role, expiresAt: invite.expiresAt },
				tenantName: vendorRecord?.name ?? '',
				wrongEmail: locals.user.email
			};
		}
		const accepted = await acceptInvite(token, locals.user.id);
		if (accepted) {
			redirect(302, '/vendors');
		}
	}

	return {
		invite: { email: invite.email, role: invite.role, expiresAt: invite.expiresAt },
		tenantName: vendorRecord?.name ?? ''
	};
};

export const actions: Actions = {
	signInAndAccept: async (event) => {
		const { params, request } = event;
		const { token } = params;
		const formData = await request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		const invite = await db.query.vendorInvitations.findFirst({
			where: eq(vendorInvitations.id, token)
		});
		if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
			return fail(400, { message: 'This invite is no longer valid.' });
		}
		if (email.toLowerCase() !== invite.email.toLowerCase()) {
			return fail(400, {
				message: `This invite was sent to ${invite.email}. Please sign in with that email.`
			});
		}

		try {
			await auth.api.signInEmail({ body: { email, password }, headers: request.headers });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Sign in failed' });
			}
			return fail(500, { message: 'Unexpected error' });
		}

		const foundUser = await db.query.user.findFirst({ where: eq(user.email, email) });
		if (!foundUser) return fail(400, { message: 'Sign in failed' });

		await acceptInvite(token, foundUser.id);
		redirect(302, '/vendors');
	},

	signUpAndAccept: async (event) => {
		const { params, request } = event;
		const { token } = params;
		const formData = await request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString() ?? '';

		const invite = await db.query.vendorInvitations.findFirst({
			where: eq(vendorInvitations.id, token)
		});
		if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
			return fail(400, { message: 'This invite is no longer valid.' });
		}
		if (email.toLowerCase() !== invite.email.toLowerCase()) {
			return fail(400, {
				message: `This invite was sent to ${invite.email}. Please use that email address.`
			});
		}

		try {
			await auth.api.signUpEmail({ body: { email, password, name }, headers: request.headers });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Registration failed' });
			}
			return fail(500, { message: 'Unexpected error' });
		}

		const foundUser = await db.query.user.findFirst({ where: eq(user.email, email) });
		if (!foundUser) return fail(400, { message: 'Account created but could not sign in' });

		await acceptInvite(token, foundUser.id);
		redirect(302, '/vendors');
	}
};
