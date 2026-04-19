import { error } from '@sveltejs/kit';

export const ROLES = ['owner', 'admin', 'staff', 'viewer'] as const;
export type TenantRole = (typeof ROLES)[number];

function isInternal(locals: App.Locals) {
	return locals.user?.isInternal === true;
}

/** internal + owner only — billing, Stripe, user management, creating new tenants */
export function requireOwner(locals: App.Locals) {
	if (isInternal(locals) || locals.tenantRole === 'owner') return;
	throw error(403, 'Owner access required');
}

/** internal + owner + admin — menu, settings, order management */
export function requireAdmin(locals: App.Locals) {
	if (isInternal(locals) || locals.tenantRole === 'owner' || locals.tenantRole === 'admin') return;
	throw error(403, 'Admin access required');
}

/** internal + owner + admin + staff — order operations */
export function requireStaff(locals: App.Locals) {
	if (isInternal(locals)) return;
	if (['owner', 'admin', 'staff'].includes(locals.tenantRole ?? '')) return;
	throw error(403, 'Staff access required');
}

/** Any authenticated user with tenant access */
export function requireTenantAccess(locals: App.Locals) {
	if (isInternal(locals)) return;
	if (locals.tenantRole) return;
	throw error(403, 'Tenant access required');
}
