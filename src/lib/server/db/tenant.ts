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

// Optional: Enum for business types / cuisines (expand as needed)
export const tenantTypeEnum = pgEnum('tenant_type', [
	'quick_service',
	'full_service',
	'cafe',
	'food_truck',
	'bar',
	'bakery',
	'other'
]);

// Main tenants table (this is your "tenant" root)
export const tenant = pgTable(
	'tenants',
	{
		id: serial('id').primaryKey(),

		// Core identity & branding
		name: varchar('name', { length: 255 }).notNull(),
		slug: varchar('slug', { length: 100 }).unique().notNull(), // Used for URLs: yourapp.com/{slug}/menu
		legalName: varchar('legal_name', { length: 255 }), // For invoices/tax
		type: tenantTypeEnum('type').default('quick_service'),

		// Contact & location
		address: jsonb('address').default({}),
		phone: varchar('phone', { length: 20 }),
		email: varchar('email', { length: 255 }),
		website: varchar('website', { length: 255 }),

		// Branding & rich visuals
		logoUrl: text('logo_url'),
		bannerUrl: text('banner_url'),
		faviconUrl: text('favicon_url'),
		backgroundImageUrl: text('background_image_url'),
		primaryColor: varchar('primary_color', { length: 7 }).default('#000000'), // hex
		secondaryColor: varchar('secondary_color', { length: 7 }).default('#374151'), // hex — used for category pills, badges, tints
		accentColor: varchar('accent_color', { length: 7 }).default('#ffffff'),

		// Business settings (flexible JSONB for future-proofing)
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

		// Per-tenant Stripe integration (for product discovery and payments)
		stripeSecretKey: text('stripe_secret_key'),
		stripeWebhookSecret: text('stripe_webhook_secret'),

		// Timestamps
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
		deletedAt: timestamp('deleted_at') // soft delete support
	},
	(table) => ({
		slugIdx: index('tenants_slug_idx').on(table.slug),
		activeIdx: index('tenants_active_idx').on(table.isActive),
		tenantLookupIdx: index('tenants_tenant_lookup_idx').on(table.slug, table.isActive)
	})
);

export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;

// Many-to-many junction: Users <-> tenants
export const tenantUsers = pgTable(
	'tenant_users',
	{
		tenantId: integer('tenant_id')
			.notNull()
			.references(() => tenant.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: varchar('role', { length: 50 }).default('owner').notNull(), // owner, manager, kitchen, staff, viewer
		assignedAt: timestamp('assigned_at').defaultNow().notNull()
	},
	(table) => [primaryKey({ columns: [table.tenantId, table.userId] })]
);

// Pending invitations — allows admins to invite users who don't yet have accounts
export const tenantInvitations = pgTable('tenant_invitations', {
	id: text('id').primaryKey(), // random UUID used as the invite token
	tenantId: integer('tenant_id')
		.notNull()
		.references(() => tenant.id, { onDelete: 'cascade' }),
	email: varchar('email', { length: 255 }).notNull(),
	role: varchar('role', { length: 50 }).default('staff').notNull(),
	invitedByUserId: text('invited_by_user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at').notNull(),
	acceptedAt: timestamp('accepted_at'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});
