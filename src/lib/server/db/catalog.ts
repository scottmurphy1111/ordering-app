import {
	pgTable,
	pgEnum,
	serial,
	integer,
	varchar,
	text,
	boolean,
	jsonb,
	timestamp,
	index,
	primaryKey
} from 'drizzle-orm/pg-core';
import { vendor } from './vendor';
import { pickupTypeEnum, availabilityModeEnum } from './types';

export const itemStatusEnum = pgEnum('item_status', ['draft', 'available', 'sold_out', 'hidden']);

// Catalog categories
export const catalogCategories = pgTable(
	'catalog_categories',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		sortOrder: integer('sort_order').default(0),
		isActive: boolean('is_active').default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
	},
	(table) => [index('catalog_categories_vendor_idx').on(table.vendorId)]
);

// Catalog items
export const catalogItems = pgTable(
	'catalog_items',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		categoryId: integer('category_id').references(() => catalogCategories.id, {
			onDelete: 'set null'
		}),

		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		price: integer('price').notNull(),
		discountedPrice: integer('discounted_price'),

		images: jsonb('images').default([]),
		videoUrl: text('video_url'),
		stripeObjectId: text('stripe_object_id'),

		allergens: jsonb('allergens').default([]),
		nutrition: jsonb('nutrition'),
		tags: text('tags').array(),

		modifiers: jsonb('modifiers').default([]),

		isSubscription: boolean('is_subscription').default(false),
		billingInterval: varchar('billing_interval', { length: 20 }),
		fulfillmentNote: text('fulfillment_note'),

		pickupType: pickupTypeEnum('pickup_type').default('windowed').notNull(),
		customDateLeadDays: integer('custom_date_lead_days').default(14),
		availabilityMode: availabilityModeEnum('availability_mode').notNull().default('always'),

		// Fulfillment channels (Phase 1). Additive + inert until Phase 3 reads them.
		// Defaults are the most-common-case so gap-created items are sellable; the
		// backfill script overwrites existing rows with precise per-row values.
		allowStoreHours: boolean('allow_store_hours').default(true).notNull(),
		allowPickupEvents: boolean('allow_pickup_events').default(true).notNull(),
		allowCustomDate: boolean('allow_custom_date').default(false).notNull(),
		isUnlisted: boolean('is_unlisted').default(false).notNull(),

		status: itemStatusEnum('status').default('available').notNull(),
		sortOrder: integer('sort_order').default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
	},
	(table) => [
		index('catalog_items_vendor_idx').on(table.vendorId),
		index('catalog_items_category_idx').on(table.categoryId),
		index('catalog_items_vendor_name_idx').on(table.vendorId, table.name),
		index('catalog_items_vendor_stripe_object_idx').on(table.vendorId, table.stripeObjectId)
	]
);

// Optional normalized modifiers
export const modifiers = pgTable('modifiers', {
	id: serial('id').primaryKey(),
	vendorId: integer('vendor_id')
		.notNull()
		.references(() => vendor.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).notNull(),
	isRequired: boolean('is_required').default(false),
	maxSelections: integer('max_selections').default(1),
	sortOrder: integer('sort_order').default(0)
});

export const modifierOptions = pgTable('modifier_options', {
	id: serial('id').primaryKey(),
	modifierId: integer('modifier_id')
		.notNull()
		.references(() => modifiers.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).notNull(),
	priceAdjustment: integer('price_adjustment').default(0),
	isDefault: boolean('is_default').default(false),
	maxQuantity: integer('max_quantity').default(1).notNull(),
	sortOrder: integer('sort_order').default(0)
});

// Junction: catalog item <-> modifier
export const catalogItemModifiers = pgTable(
	'catalog_item_modifiers',
	{
		catalogItemId: integer('catalog_item_id')
			.notNull()
			.references(() => catalogItems.id, { onDelete: 'cascade' }),
		modifierId: integer('modifier_id')
			.notNull()
			.references(() => modifiers.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.catalogItemId, table.modifierId] })]
);
