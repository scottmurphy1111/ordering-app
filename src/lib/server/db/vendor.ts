import {
	pgTable,
	serial,
	varchar,
	text,
	boolean,
	jsonb,
	timestamp,
	integer,
	pgEnum,
	primaryKey,
	index
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const vendorTypeEnum = pgEnum('vendor_type', [
	'quick_service',
	'full_service',
	'cafe',
	'food_truck',
	'bar',
	'bakery',
	'other'
]);

export const vendor = pgTable(
	'vendors',
	{
		id: serial('id').primaryKey(),

		// Core identity & branding
		name: varchar('name', { length: 255 }).notNull(),
		slug: varchar('slug', { length: 100 }).unique().notNull(),
		legalName: varchar('legal_name', { length: 255 }),
		type: vendorTypeEnum('type').default('quick_service'),

		// Contact & location
		address: jsonb('address').default({}),
		phone: varchar('phone', { length: 20 }),
		email: varchar('email', { length: 255 }),
		website: varchar('website', { length: 255 }),

		// Public-facing description shown on the storefront
		tagline: varchar('tagline', { length: 255 }),

		// Branding & rich visuals
		logoUrl: text('logo_url'),
		bannerUrl: text('banner_url'),
		faviconUrl: text('favicon_url'),
		backgroundImageUrl: text('background_image_url'),
		backgroundColor: varchar('background_color', { length: 7 }).default('#000000'),
		accentColor: varchar('accent_color', { length: 7 }).default('#374151'),
		foregroundColor: varchar('foreground_color', { length: 7 }).default('#ffffff'),

		// Business settings
		settings: jsonb('settings').default({
			currency: 'USD',
			taxRate: 0.0825,
			enableTips: true,
			defaultTipPercentages: [15, 18, 20],
			allowPickup: true,
			allowDelivery: false,
			minimumOrderAmount: 0,
			estimatedPrepTimeMinutes: 15,
			hours: {},
			specialHours: []
		}),

		// Operational status
		isActive: boolean('is_active').default(true).notNull(),
		isApproved: boolean('is_approved').default(true),
		suspendedAt: timestamp('suspended_at'),
		suspendedReason: text('suspended_reason'),

		// Subscription & billing info
		subscriptionTier: varchar('subscription_tier', { length: 50 }).default('starter'),
		subscriptionStatus: varchar('subscription_status', { length: 50 }).default('active'),
		stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
		stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),

		// Per-vendor Stripe integration
		stripeSecretKey: text('stripe_secret_key'),
		stripePublishableKey: text('stripe_publishable_key'),
		stripeWebhookSecret: text('stripe_webhook_secret'),
		stripeWebhookEndpointId: text('stripe_webhook_endpoint_id'),

		// Active add-ons with their Stripe subscription item IDs
		addons: jsonb('addons').default([]).$type<import('$lib/billing').AddonItem[]>(),

		// Timestamps
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
		deletedAt: timestamp('deleted_at')
	},
	(table) => ({
		slugIdx: index('vendors_slug_idx').on(table.slug),
		activeIdx: index('vendors_active_idx').on(table.isActive),
		vendorLookupIdx: index('vendors_vendor_lookup_idx').on(table.slug, table.isActive)
	})
);

export type Vendor = typeof vendor.$inferSelect;
export type NewVendor = typeof vendor.$inferInsert;

// Many-to-many junction: Users <-> vendors
export const vendorUsers = pgTable(
	'vendor_users',
	{
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: varchar('role', { length: 50 }).default('owner').notNull(),
		assignedAt: timestamp('assigned_at').defaultNow().notNull()
	},
	(table) => [primaryKey({ columns: [table.vendorId, table.userId] })]
);

// Pending invitations
export const vendorInvitations = pgTable('vendor_invitations', {
	id: text('id').primaryKey(),
	vendorId: integer('vendor_id')
		.notNull()
		.references(() => vendor.id, { onDelete: 'cascade' }),
	email: varchar('email', { length: 255 }).notNull(),
	role: varchar('role', { length: 50 }).default('staff').notNull(),
	invitedByUserId: text('invited_by_user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at').notNull(),
	acceptedAt: timestamp('accepted_at'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});
