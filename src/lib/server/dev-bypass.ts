// DEV AUTH BYPASS — local development only.
// Controlled entirely by DEV_BYPASS_AUTH=true in .env.
// This file is never executed when that env var is absent or false.

import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { user as userTable } from '$lib/server/db/auth.schema';
import { tenant as tenantTable, tenantUsers } from '$lib/server/db/tenant';
import type { Tenant } from '$lib/server/db/tenant';

const DEV_USER_ID = 'dev-bypass-user';
const DEV_TENANT_SLUG = 'dev-shop';

export const DEV_FAKE_USER = {
	id: DEV_USER_ID,
	name: 'Dev User',
	email: 'dev@localhost',
	emailVerified: true as const,
	image: null,
	isInternal: false,
	bannedAt: null,
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01')
};

export const DEV_FAKE_SESSION = {
	id: 'dev-bypass-session',
	expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
	token: 'dev-bypass-session-token',
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
	ipAddress: '127.0.0.1',
	userAgent: 'Dev Bypass',
	userId: DEV_USER_ID
};

// Cached after first successful seed so we only hit the DB once per server process.
let cachedDevTenant: Tenant | null = null;

export async function ensureDevSeed(): Promise<Tenant> {
	if (cachedDevTenant) return cachedDevTenant;

	await db
		.insert(userTable)
		.values({
			id: DEV_USER_ID,
			name: 'Dev User',
			email: 'dev@localhost',
			emailVerified: true,
			isInternal: false,
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-01')
		})
		.onConflictDoNothing();

	await db
		.insert(tenantTable)
		.values({
			name: 'Dev Shop',
			slug: DEV_TENANT_SLUG,
			isActive: true,
			subscriptionTier: 'pro'
		})
		.onConflictDoNothing();

	const devTenant = await db.query.tenant.findFirst({
		where: eq(tenantTable.slug, DEV_TENANT_SLUG)
	});

	if (!devTenant) throw new Error('[DEV BYPASS] Failed to find dev tenant after upsert.');

	await db
		.insert(tenantUsers)
		.values({
			tenantId: devTenant.id,
			userId: DEV_USER_ID,
			role: 'owner'
		})
		.onConflictDoNothing();

	cachedDevTenant = devTenant;
	return devTenant;
}
