import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { tenantUsers, tenantInvitations } from '$lib/server/db/tenant';
import { tenant } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

async function acceptInvite(token: string, userId: string) {
	const invite = await db.query.tenantInvitations.findFirst({
		where: eq(tenantInvitations.id, token)
	});
	if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return false;

	// Add to tenant (ignore if already a member)
	const existing = await db.query.tenantUsers.findFirst({
		where: and(eq(tenantUsers.tenantId, invite.tenantId), eq(tenantUsers.userId, userId))
	});
	if (!existing) {
		await db.insert(tenantUsers).values({
			tenantId: invite.tenantId,
			userId,
			role: invite.role as 'owner' | 'manager' | 'kitchen' | 'staff' | 'viewer'
		});
	}

	await db
		.update(tenantInvitations)
		.set({ acceptedAt: new Date() })
		.where(eq(tenantInvitations.id, token));

	return true;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { token } = params;

	const invite = await db.query.tenantInvitations.findFirst({
		where: eq(tenantInvitations.id, token)
	});

	if (!invite) return { invalid: true };
	if (invite.acceptedAt) return { alreadyAccepted: true };
	if (invite.expiresAt < new Date()) return { expired: true };

	const tenantRecord = await db.query.tenant.findFirst({
		where: eq(tenant.id, invite.tenantId)
	});

	// If already logged in, try to auto-accept
	if (locals.user) {
		if (locals.user.email.toLowerCase() !== invite.email.toLowerCase()) {
			return {
				invite: { email: invite.email, role: invite.role, expiresAt: invite.expiresAt },
				tenantName: tenantRecord?.name ?? '',
				wrongEmail: locals.user.email
			};
		}
		const accepted = await acceptInvite(token, locals.user.id);
		if (accepted) {
			redirect(302, '/tenants');
		}
	}

	return {
		invite: { email: invite.email, role: invite.role, expiresAt: invite.expiresAt },
		tenantName: tenantRecord?.name ?? ''
	};
};

export const actions: Actions = {
	signInAndAccept: async (event) => {
		const { params, request } = event;
		const { token } = params;
		const formData = await request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		const invite = await db.query.tenantInvitations.findFirst({
			where: eq(tenantInvitations.id, token)
		});
		if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
			return fail(400, { message: 'This invite is no longer valid.' });
		}
		if (email.toLowerCase() !== invite.email.toLowerCase()) {
			return fail(400, { message: `This invite was sent to ${invite.email}. Please sign in with that email.` });
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
		redirect(302, '/tenants');
	},

	signUpAndAccept: async (event) => {
		const { params, request } = event;
		const { token } = params;
		const formData = await request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString() ?? '';

		const invite = await db.query.tenantInvitations.findFirst({
			where: eq(tenantInvitations.id, token)
		});
		if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
			return fail(400, { message: 'This invite is no longer valid.' });
		}
		if (email.toLowerCase() !== invite.email.toLowerCase()) {
			return fail(400, { message: `This invite was sent to ${invite.email}. Please use that email address.` });
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
		redirect(302, '/tenants');
	}
};
