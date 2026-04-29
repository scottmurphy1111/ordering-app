// DEV AUTH BYPASS — local development only.
// Controlled entirely by DEV_BYPASS_AUTH=true in .env.
// This file is never executed when that env var is absent or false.

import { db } from '$lib/server/db';
import { eq, count } from 'drizzle-orm';
import { user as userTable } from '$lib/server/db/auth.schema';
import { vendor as vendorTable, vendorUsers } from '$lib/server/db/vendor';
import { catalogItems } from '$lib/server/db/catalog';
import type { Vendor } from '$lib/server/db/vendor';
import { seedDemoVendor } from '$lib/server/seed-demo';

const DEV_USER_ID = 'dev-bypass-user';
const DEV_VENDOR_SLUG = 'sunrise-bread';

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
let cachedDevVendor: Vendor | null = null;

export async function ensureDevSeed(): Promise<Vendor> {
	if (cachedDevVendor) return cachedDevVendor;

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

	const DEV_VENDOR_SETTINGS = {
		currency: 'USD',
		taxRate: 0.0825,
		enableTips: false,
		defaultTipPercentages: [15, 18, 20],
		allowPickup: true,
		allowDelivery: false,
		minimumOrderAmount: 0,
		estimatedPrepTimeMinutes: 15,
		asapPickupEnabled: false,
		hours: {},
		specialHours: []
	};

	await db
		.insert(vendorTable)
		.values({
			name: 'Sunrise Bread Co.',
			slug: DEV_VENDOR_SLUG,
			isActive: true,
			subscriptionTier: 'pro',
			type: 'bakery',
			timezone: 'America/New_York',
			settings: DEV_VENDOR_SETTINGS
		})
		.onConflictDoUpdate({
			target: vendorTable.slug,
			set: { type: 'bakery', timezone: 'America/New_York', settings: DEV_VENDOR_SETTINGS }
		});

	const devVendor = await db.query.vendor.findFirst({
		where: eq(vendorTable.slug, DEV_VENDOR_SLUG)
	});

	if (!devVendor) throw new Error('[DEV BYPASS] Failed to find dev vendor after upsert.');

	await db
		.insert(vendorUsers)
		.values({
			vendorId: devVendor.id,
			userId: DEV_USER_ID,
			role: 'owner'
		})
		.onConflictDoNothing();

	const [{ itemCount }] = await db
		.select({ itemCount: count() })
		.from(catalogItems)
		.where(eq(catalogItems.vendorId, devVendor.id));
	if (itemCount === 0) await seedDemoVendor(devVendor.id);

	cachedDevVendor = devVendor;
	return devVendor;
}
