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
	'bakery',
	'farm',
	'butcher',
	'florist',
	'brewery',
	'coffee_shop',
	'food_truck',
	'specialty_maker',
	'market_vendor',
	'other'
]);

export const fulfillmentModelEnum = pgEnum('fulfillment_model', [
	'storefront',
	'pickup_only',
	'hybrid'
]);

export const headerModeEnum = pgEnum('header_mode', ['logo', 'name']);

export const heroDisplayModeEnum = pgEnum('hero_display_mode', [
	'none',
	'headline',
	'headline_tagline'
]);

export const vendor = pgTable(
	'vendors',
	{
		id: serial('id').primaryKey(),

		// Core identity & branding
		name: varchar('name', { length: 255 }).notNull(),
		slug: varchar('slug', { length: 100 }).unique().notNull(),
		legalName: varchar('legal_name', { length: 255 }),
		type: vendorTypeEnum('type').default('bakery'),
		fulfillmentModel: fulfillmentModelEnum('fulfillment_model').notNull(),

		// Contact & location
		address: jsonb('address').default({}),
		timezone: text('timezone').notNull().default('America/New_York'),
		phone: varchar('phone', { length: 20 }),
		email: varchar('email', { length: 255 }),
		website: varchar('website', { length: 255 }),

		// Public-facing description shown on the storefront
		tagline: varchar('tagline', { length: 255 }),

		// Branding & rich visuals
		logoUrl: text('logo_url'),
		heroImageUrl: text('hero_image_url'),
		faviconUrl: text('favicon_url'),
		backgroundColor: varchar('background_color', { length: 7 }).default('#000000'),
		accentColor: varchar('accent_color', { length: 7 }).default('#374151'),
		foregroundColor: varchar('foreground_color', { length: 7 }).default('#ffffff'),

		// Header surface: mutually exclusive — show the logo OR the business name.
		// 'logo' falls back to name rendering when logoUrl is null.
		headerMode: headerModeEnum('header_mode').default('logo').notNull(),

		// Hero surface: text overlay options on top of the heroImageUrl.
		// 'none' = image only; 'headline' = headline only; 'headline_tagline' = both.
		heroDisplayMode: heroDisplayModeEnum('hero_display_mode').default('headline_tagline').notNull(),
		heroHeadline: varchar('hero_headline', { length: 80 }),

		// When false, the storefront hides the Custom Orders section
		// and the /request route redirects to /catalog. Existing requests
		// and quotes are unaffected.
		acceptsRequests: boolean('accepts_requests').default(true).notNull(),

		// Default for special-order balance auto-reminders. Per-balance
		// special_order_payments.reminders_enabled overrides this (null = inherit).
		balanceRemindersEnabled: boolean('balance_reminders_enabled').default(true).notNull(),

		// Font pairing: heading font + body font slugs. Defaults match
		// the current hardcoded Fraunces + DM Sans combination.
		fontPair: varchar('font_pair', { length: 32 }).default('fraunces-dm-sans').notNull(),

		// Business settings
		settings: jsonb('settings').default({
			currency: 'USD',
			taxRate: 0.0825,
			enableTips: false,
			defaultTipPercentages: [15, 18, 20],
			allowPickup: true,
			minimumOrderAmount: 0,
			estimatedPrepTimeMinutes: 15,
			asapPickupEnabled: false
		}),

		// Operational status
		isActive: boolean('is_active').default(true).notNull(),
		// Vendor-controlled storefront visibility. Distinct from isActive (which
		// also gates dashboard access); storefrontEnabled only hides the public storefront.
		storefrontEnabled: boolean('storefront_enabled').default(true).notNull(),
		isApproved: boolean('is_approved').default(true),
		suspendedAt: timestamp('suspended_at', { withTimezone: true }),
		suspendedReason: text('suspended_reason'),

		// Subscription & billing info
		subscriptionTier: varchar('subscription_tier', { length: 50 }).default('starter'),
		subscriptionStatus: varchar('subscription_status', { length: 50 }).default('active'),
		subscriptionEndsAt: timestamp('subscription_ends_at', { withTimezone: true }),
		// Marks that the immediate-cancel path was used (cancelImmediate action),
		// independent of whether money actually moved. Set when:
		//   - a prorated refund was issued (to card or to customer balance), or
		//   - the vendor was in their final period month and nothing was owed back
		//     (refundCents === 0).
		// Used to (a) block the reactivate "Don't cancel" button, (b) swap the
		// persistent cancel banner to the "this is final" copy, (c) block re-running
		// cancelImmediate on the same subscription.
		// Reset to null on every new subscription create in the upgrade action.
		// Edge case: stays null if a refund was attempted (refundCents > 0) but BOTH
		// the card refund AND the balance-credit fallback threw. Vendor loses service
		// in that path with no audit row — pre-existing failure mode, separate concern.
		subscriptionRefundedAt: timestamp('subscription_refunded_at', { withTimezone: true }),
		subscriptionPausedAt: timestamp('subscription_paused_at', { withTimezone: true }),
		pauseUntil: timestamp('pause_until', { withTimezone: true }),
		stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
		stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),

		// Per-vendor Stripe integration
		stripeSecretKey: text('stripe_secret_key'),
		stripePublishableKey: text('stripe_publishable_key'),
		stripeWebhookSecret: text('stripe_webhook_secret'),
		stripeWebhookEndpointId: text('stripe_webhook_endpoint_id'),

		// Active add-ons with their Stripe subscription item IDs
		addons: jsonb('addons').default([]).$type<import('$lib/billing').AddonItem[]>(),

		// Per-vendor notification preferences (email opt-outs + marketing opt-in)
		notificationPrefs: jsonb('notification_prefs')
			.default({ emailOptOuts: [], marketingOptIn: false })
			.$type<{ emailOptOuts: string[]; marketingOptIn: boolean }>(),

		// Per-vendor sequential order counter — incremented atomically at order creation
		lastOrderNumber: integer('last_order_number').notNull().default(0),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		deletedAt: timestamp('deleted_at', { withTimezone: true })
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
		assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [primaryKey({ columns: [table.vendorId, table.userId] })]
);

// Per-user, per-vendor marker of when this user last opened the Production view.
// Drives the Production tab "new orders" badge and the per-item "New" markers.
export const productionLastViewed = pgTable(
	'production_last_viewed',
	{
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }).defaultNow().notNull()
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
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	acceptedAt: timestamp('accepted_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});
