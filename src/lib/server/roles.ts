import { error } from '@sveltejs/kit';

export const ROLES = ['owner', 'admin', 'staff', 'viewer'] as const;
export type VendorRole = (typeof ROLES)[number];

function isInternal(locals: App.Locals) {
	return locals.user?.isInternal === true;
}

/** internal + owner only — billing, Stripe, user management, creating new vendors */
export function requireOwner(locals: App.Locals) {
	if (isInternal(locals) || locals.vendorRole === 'owner') return;
	throw error(403, 'Owner access required');
}

/** internal + owner + admin — catalog, settings, order management */
export function requireAdmin(locals: App.Locals) {
	if (isInternal(locals) || locals.vendorRole === 'owner' || locals.vendorRole === 'admin') return;
	throw error(403, 'Admin access required');
}

/** internal + owner + admin + staff — order operations */
export function requireStaff(locals: App.Locals) {
	if (isInternal(locals)) return;
	if (['owner', 'admin', 'staff'].includes(locals.vendorRole ?? '')) return;
	throw error(403, 'Staff access required');
}

/** Any authenticated user with vendor access */
export function requireVendorAccess(locals: App.Locals) {
	if (isInternal(locals)) return;
	if (locals.vendorRole) return;
	throw error(403, 'Vendor access required');
}
