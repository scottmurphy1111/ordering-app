import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { vendorUsers, vendorInvitations, vendor } from '$lib/server/db/vendor';
import { user } from '$lib/server/db/auth.schema';
import { env } from '$env/dynamic/private';
import { sendEmail } from '$lib/server/email';
import { inviteEmail } from '$lib/server/email/templates/invite';

import { ROLES, requireOwner } from '$lib/server/roles';
type Role = 'owner' | 'admin' | 'staff' | 'viewer';

export const load: PageServerLoad = async ({ locals }) => {
	const vendorId = locals.vendorId!;
	const currentUserId = locals.user!.id;

	const members = await db
		.select({
			userId: vendorUsers.userId,
			role: vendorUsers.role,
			assignedAt: vendorUsers.assignedAt,
			name: user.name,
			email: user.email,
			isInternal: user.isInternal
		})
		.from(vendorUsers)
		.innerJoin(user, eq(vendorUsers.userId, user.id))
		.where(eq(vendorUsers.vendorId, vendorId))
		.orderBy(vendorUsers.assignedAt);

	const currentMember = members.find((m) => m.userId === currentUserId);
	const canManageInternal = currentMember?.role === 'owner' || locals.user?.isInternal === true;

	let internalUsers: { id: string; name: string; email: string; createdAt: Date }[] = [];
	if (canManageInternal) {
		internalUsers = await db
			.select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
			.from(user)
			.where(eq(user.isInternal, true));
	}

	const pendingInvitations =
		currentMember?.role === 'owner' || locals.user?.isInternal
			? await db
					.select({
						id: vendorInvitations.id,
						email: vendorInvitations.email,
						role: vendorInvitations.role,
						expiresAt: vendorInvitations.expiresAt,
						createdAt: vendorInvitations.createdAt
					})
					.from(vendorInvitations)
					.where(
						and(
							eq(vendorInvitations.vendorId, vendorId),
							isNull(vendorInvitations.acceptedAt),
							gt(vendorInvitations.expiresAt, new Date())
						)
					)
					.orderBy(vendorInvitations.createdAt)
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
	addMember: async ({ request, locals }) => {
		requireOwner(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const role = formData.get('role')?.toString() as Role;

		if (!email) return fail(400, { addError: 'Email is required' });
		if (!ROLES.includes(role)) return fail(400, { addError: 'Invalid role' });

		const foundUser = await db.query.user.findFirst({ where: eq(user.email, email) });
		if (!foundUser) return fail(404, { addError: `No account found for ${email}` });

		const existing = await db.query.vendorUsers.findFirst({
			where: and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.userId, foundUser.id))
		});
		if (existing) return fail(409, { addError: `${email} is already a member` });

		await db.insert(vendorUsers).values({ vendorId, userId: foundUser.id, role });
		return { addSuccess: true };
	},

	sendInvite: async ({ request, locals }) => {
		requireOwner(locals);
		const vendorId = locals.vendorId!;
		const currentUserId = locals.user!.id;
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const role = formData.get('role')?.toString() as Role;

		if (!email) return fail(400, { inviteError: 'Email is required' });
		if (!ROLES.includes(role)) return fail(400, { inviteError: 'Invalid role' });

		const existingUser = await db.query.user.findFirst({ where: eq(user.email, email) });
		if (existingUser) {
			const existingMember = await db.query.vendorUsers.findFirst({
				where: and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.userId, existingUser.id))
			});
			if (existingMember) return fail(409, { inviteError: `${email} is already a member` });
		}

		await db
			.delete(vendorInvitations)
			.where(and(eq(vendorInvitations.vendorId, vendorId), eq(vendorInvitations.email, email)));

		const token = crypto.randomUUID();
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		await db.insert(vendorInvitations).values({
			id: token,
			vendorId,
			email,
			role,
			invitedByUserId: currentUserId,
			expiresAt
		});

		const inviteUrl = `${env.ORIGIN}/invite/${token}`;

		const vendorRecord = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { name: true, backgroundColor: true }
		});
		const inviterName = locals.user!.name ?? locals.user!.email;

		if (vendorRecord) {
			await sendEmail({
				to: email,
				subject: `You're invited to join ${vendorRecord.name}`,
				html: inviteEmail({
					tenantName: vendorRecord.name,
					primaryColor: vendorRecord.backgroundColor ?? undefined,
					invitedByName: inviterName,
					role,
					inviteUrl
				})
			}).catch(console.error);
		}

		return { inviteSuccess: true, inviteUrl, inviteEmail: email };
	},

	cancelInvite: async ({ request, locals }) => {
		requireOwner(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) return fail(400, { error: 'Invalid' });

		await db
			.delete(vendorInvitations)
			.where(and(eq(vendorInvitations.id, id), eq(vendorInvitations.vendorId, vendorId)));

		return { success: true };
	},

	changeRole: async ({ request, locals }) => {
		requireOwner(locals);
		const vendorId = locals.vendorId!;
		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const role = formData.get('role')?.toString() as Role;

		if (!userId || !ROLES.includes(role)) return fail(400, { error: 'Invalid' });

		await db
			.update(vendorUsers)
			.set({ role })
			.where(and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.userId, userId)));

		return { success: true };
	},

	removeMember: async ({ request, locals }) => {
		requireOwner(locals);
		const vendorId = locals.vendorId!;
		const currentUserId = locals.user!.id;
		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) return fail(400, { error: 'Invalid' });
		if (userId === currentUserId) return fail(400, { error: "You can't remove yourself" });

		const targetMember = await db.query.vendorUsers.findFirst({
			where: and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.userId, userId))
		});
		if (targetMember?.role === 'owner') {
			const ownerCount = await db
				.select()
				.from(vendorUsers)
				.where(and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.role, 'owner')));
			if (ownerCount.length <= 1) {
				return fail(400, { error: 'Cannot remove the last owner' });
			}
		}

		await db
			.delete(vendorUsers)
			.where(and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.userId, userId)));

		return { success: true };
	},

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
