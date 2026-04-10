import {
	pgTable,
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
import { tenant } from './tenant';

// Menu categories (Appetizers, Burgers, Drinks, etc.)
export const menuCategories = pgTable(
	'menu_categories',
	{
		id: serial('id').primaryKey(),
		tenantId: integer('tenant_id')
			.notNull()
			.references(() => tenant.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		sortOrder: integer('sort_order').default(0),
		isActive: boolean('is_active').default(true),
		createdAt: timestamp('created_at').defaultNow()
	},
	(table) => ({
		tenantIdx: index('menu_categories_tenant_idx').on(table.tenantId)
	})
);

// Main menu items with rich product views
export const menuItems = pgTable(
	'menu_items',
	{
		id: serial('id').primaryKey(),
		tenantId: integer('tenant_id')
			.notNull()
			.references(() => tenant.id, { onDelete: 'cascade' }),
		categoryId: integer('category_id').references(() => menuCategories.id, {
			onDelete: 'set null'
		}),

		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		price: integer('price').notNull(), // store in cents (e.g., 1299 = $12.99) for precision
		discountedPrice: integer('discounted_price'), // optional

		images: jsonb('images').default([]), // array of { url, alt, isPrimary, width, height } for rich views
		videoUrl: text('video_url'), // optional product video

		allergens: jsonb('allergens').default([]), // e.g., ["nuts", "gluten"]
		nutrition: jsonb('nutrition'), // { calories, protein, ... }
		tags: text('tags').array(), // ["spicy", "vegetarian", "popular"]

		modifiers: jsonb('modifiers').default([]), // flexible: [{ name: "Size", required: true, options: [{name, price, ...}] }, ...]
		// Or normalize modifiers into separate tables (see below) for advanced queries

		available: boolean('available').default(true),
		sortOrder: integer('sort_order').default(0),
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow()
	},
	(table) => ({
		tenantIdx: index('menu_items_restaurant_idx').on(table.tenantId),
		categoryIdx: index('menu_items_category_idx').on(table.categoryId),
		restaurantNameIdx: index('menu_items_restaurant_name_idx').on(table.tenantId, table.name)
	})
);

// Optional normalized modifiers (better for complex pricing/queries)
export const modifiers = pgTable('modifiers', {
	id: serial('id').primaryKey(),
	tenantId: integer('tenant_id')
		.notNull()
		.references(() => tenant.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).notNull(), // "Size", "Add-ons", "Doneness"
	isRequired: boolean('is_required').default(false),
	maxSelections: integer('max_selections').default(1),
	sortOrder: integer('sort_order').default(0)
});

export const modifierOptions = pgTable('modifier_options', {
	id: serial('id').primaryKey(),
	modifierId: integer('modifier_id')
		.notNull()
		.references(() => modifiers.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).notNull(), // "Small", "Medium", "Bacon"
	priceAdjustment: integer('price_adjustment').default(0), // in cents
	isDefault: boolean('is_default').default(false)
});

// Junction: menu item <-> modifier (many-to-many)
export const menuItemModifiers = pgTable(
	'menu_item_modifiers',
	{
		menuItemId: integer('menu_item_id')
			.notNull()
			.references(() => menuItems.id, { onDelete: 'cascade' }),
		modifierId: integer('modifier_id')
			.notNull()
			.references(() => modifiers.id, { onDelete: 'cascade' })
	},
	(table) => ({
		pk: primaryKey({ columns: [table.menuItemId, table.modifierId] })
	})
);
