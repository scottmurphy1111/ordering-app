import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { tenantUsers, tenantInvitations } from '$lib/server/db/tenant';
import { user } from '$lib/server/db/auth.schema';
import { env } from '$env/dynamic/private';
import { sendEmail } from '$lib/server/email';
import { inviteEmail } from '$lib/server/email/templates/invite';
import { tenant } from '$lib/server/db/tenant';

import { ROLES, requireOwner } from '$lib/server/roles';
type Role = 'owner' | 'admin' | 'staff' | 'viewer';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;
	const currentUserId = locals.user!.id;

	// Fetch current tenant members with user details
	const members = await db
		.select({
			userId: tenantUsers.userId,
			role: tenantUsers.role,
			assignedAt: tenantUsers.assignedAt,
			name: user.name,
			email: user.email,
			isInternal: user.isInternal
		})
		.from(tenantUsers)
		.innerJoin(user, eq(tenantUsers.userId, user.id))
		.where(eq(tenantUsers.tenantId, tenantId))
		.orderBy(tenantUsers.assignedAt);

	// Fetch all internal (platform) users — visible to owners and internal users
	const currentMember = members.find((m) => m.userId === currentUserId);
	const canManageInternal = currentMember?.role === 'owner' || locals.user?.isInternal === true;

	let internalUsers: { id: string; name: string; email: string; createdAt: Date }[] = [];
	if (canManageInternal) {
		internalUsers = await db
			.select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
			.from(user)
			.where(eq(user.isInternal, true));
	}

	// Fetch pending (not yet accepted, not expired) invitations for this tenant
	const pendingInvitations =
		currentMember?.role === 'owner' || locals.user?.isInternal
			? await db
					.select({
						id: tenantInvitations.id,
						email: tenantInvitations.email,
						role: tenantInvitations.role,
						expiresAt: tenantInvitations.expiresAt,
						createdAt: tenantInvitations.createdAt
					})
					.from(tenantInvitations)
					.where(
						and(
							eq(tenantInvitations.tenantId, tenantId),
							isNull(tenantInvitations.acceptedAt),
							gt(tenantInvitations.expiresAt, new Date())
						)
					)
					.orderBy(tenantInvitations.createdAt)
			: [];

	return {
		members,
		internalUsers,
		pendingInvitations,
		currentUserId,
		currentRole: currentMember?.role ?? null,
		canManageInternal,
		roles: ROLES,
		origin: env.ORIGIN ?? ''
	};
};

export const actions: Actions = {
	// Add an existing user to this tenant by email
	addMember: async ({ request, locals }) => {
		requireOwner(locals);
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const role = formData.get('role')?.toString() as Role;

		if (!email) return fail(400, { addError: 'Email is required' });
		if (!ROLES.includes(role)) return fail(400, { addError: 'Invalid role' });

		const foundUser = await db.query.user.findFirst({ where: eq(user.email, email) });
		if (!foundUser) return fail(404, { addError: `No account found for ${email}` });

		const existing = await db.query.tenantUsers.findFirst({
			where: and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, foundUser.id))
		});
		if (existing) return fail(409, { addError: `${email} is already a member` });

		await db.insert(tenantUsers).values({ tenantId, userId: foundUser.id, role });
		return { addSuccess: true };
	},

	// Send an invite link to an email (works for users who don't have an account yet)
	sendInvite: async ({ request, locals }) => {
		requireOwner(locals);
		const tenantId = locals.tenantId!;
		const currentUserId = locals.user!.id;
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const role = formData.get('role')?.toString() as Role;

		if (!email) return fail(400, { inviteError: 'Email is required' });
		if (!ROLES.includes(role)) return fail(400, { inviteError: 'Invalid role' });

		// Don't invite someone already a member
		const existingUser = await db.query.user.findFirst({ where: eq(user.email, email) });
		if (existingUser) {
			const existingMember = await db.query.tenantUsers.findFirst({
				where: and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, existingUser.id))
			});
			if (existingMember) return fail(409, { inviteError: `${email} is already a member` });
		}

		// Cancel any existing pending invite for the same email in this tenant
		await db
			.delete(tenantInvitations)
			.where(and(eq(tenantInvitations.tenantId, tenantId), eq(tenantInvitations.email, email)));

		const token = crypto.randomUUID();
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

		await db.insert(tenantInvitations).values({
			id: token,
			tenantId,
			email,
			role,
			invitedByUserId: currentUserId,
			expiresAt
		});

		const inviteUrl = `${env.ORIGIN}/invite/${token}`;

		const tenantRecord = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { name: true, primaryColor: true }
		});
		const inviterName = locals.user!.name ?? locals.user!.email;

		if (tenantRecord) {
			await sendEmail({
				to: email,
				subject: `You're invited to join ${tenantRecord.name}`,
				html: inviteEmail({
					tenantName: tenantRecord.name,
					primaryColor: tenantRecord.primaryColor ?? undefined,
					invitedByName: inviterName,
					role,
					inviteUrl
				})
			}).catch(console.error);
		}

		return { inviteSuccess: true, inviteUrl, inviteEmail: email };
	},

	// Cancel a pending invitation
	cancelInvite: async ({ request, locals }) => {
		requireOwner(locals);
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) return fail(400, { error: 'Invalid' });

		await db
			.delete(tenantInvitations)
			.where(and(eq(tenantInvitations.id, id), eq(tenantInvitations.tenantId, tenantId)));

		return { success: true };
	},

	// Change an existing member's role
	changeRole: async ({ request, locals }) => {
		requireOwner(locals);
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const role = formData.get('role')?.toString() as Role;

		if (!userId || !ROLES.includes(role)) return fail(400, { error: 'Invalid' });

		await db
			.update(tenantUsers)
			.set({ role })
			.where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)));

		return { success: true };
	},

	// Remove a member from this tenant
	removeMember: async ({ request, locals }) => {
		requireOwner(locals);
		const tenantId = locals.tenantId!;
		const currentUserId = locals.user!.id;
		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) return fail(400, { error: 'Invalid' });
		if (userId === currentUserId) return fail(400, { error: "You can't remove yourself" });

		// Prevent removing the last owner
		const targetMember = await db.query.tenantUsers.findFirst({
			where: and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId))
		});
		if (targetMember?.role === 'owner') {
			const ownerCount = await db
				.select()
				.from(tenantUsers)
				.where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.role, 'owner')));
			if (ownerCount.length <= 1) {
				return fail(400, { error: 'Cannot remove the last owner' });
			}
		}

		await db
			.delete(tenantUsers)
			.where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)));

		return { success: true };
	},

	// Toggle isInternal on a user (platform-level, owner/internal only)
	toggleInternal: async ({ request, locals }) => {
		requireOwner(locals);
		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const current = formData.get('isInternal') === 'true';

		if (!userId) return fail(400, { error: 'Invalid' });

		await db.update(user).set({ isInternal: !current }).where(eq(user.id, userId));
		return { success: true };
	}
};
