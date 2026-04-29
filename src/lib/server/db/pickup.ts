import {
	pgTable,
	serial,
	integer,
	text,
	boolean,
	jsonb,
	timestamp,
	time,
	index,
	unique
} from 'drizzle-orm/pg-core';
import { vendor } from './vendor';

// Named location where customers collect their orders.
// A vendor can have multiple (e.g. Saturday market booth + farm stand).
export const pickupLocations = pgTable(
	'pickup_locations',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		address: jsonb('address'),
		notes: text('notes'),
		sortOrder: integer('sort_order').notNull().default(0),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('pickup_locations_vendor_idx').on(t.vendorId),
		index('pickup_locations_active_idx').on(t.vendorId, t.isActive)
	]
);

// Recurrence pattern for a series of pickup windows.
// One template produces many concrete pickup_windows rows via materialization (Phase 4).
export const pickupWindowTemplates = pgTable(
	'pickup_window_templates',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		locationId: integer('location_id').references(() => pickupLocations.id, {
			onDelete: 'set null'
		}),
		name: text('name').notNull(),
		// RRULE string — e.g. "FREQ=WEEKLY;BYDAY=SA". Parsed/expanded in Phase 4.
		recurrence: text('recurrence').notNull(),
		// Wall-clock times in the vendor's timezone (vendors.timezone).
		// Materialization converts these to TIMESTAMPTZ when generating pickup_windows rows.
		windowStart: time('window_start').notNull(),
		windowEnd: time('window_end').notNull(),
		cutoffHours: integer('cutoff_hours').notNull().default(48),
		maxOrders: integer('max_orders'),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('pickup_window_templates_vendor_idx').on(t.vendorId),
		index('pickup_window_templates_active_idx').on(t.vendorId, t.isActive)
	]
);

// Concrete, materialized pickup slot. Generated from a template by Phase 4.
// Orders FK to this table. All datetimes are TIMESTAMPTZ (stored as UTC).
export const pickupWindows = pgTable(
	'pickup_windows',
	{
		id: serial('id').primaryKey(),
		templateId: integer('template_id').references(() => pickupWindowTemplates.id, {
			onDelete: 'set null'
		}),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		locationId: integer('location_id').references(() => pickupLocations.id, {
			onDelete: 'set null'
		}),
		name: text('name').notNull(),
		startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
		endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
		// Derived at generation time: startsAt - cutoffHours. Enforced server-side at checkout.
		cutoffAt: timestamp('cutoff_at', { withTimezone: true }).notNull(),
		maxOrders: integer('max_orders'),
		isCancelled: boolean('is_cancelled').notNull().default(false),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('pickup_windows_vendor_idx').on(t.vendorId),
		index('pickup_windows_vendor_starts_idx').on(t.vendorId, t.startsAt),
		index('pickup_windows_template_idx').on(t.templateId),
		// Prevents duplicate materialization of the same occurrence.
		unique('pickup_windows_template_starts_unique').on(t.templateId, t.startsAt)
	]
);

export type PickupLocation = typeof pickupLocations.$inferSelect;
export type NewPickupLocation = typeof pickupLocations.$inferInsert;

export type PickupWindowTemplate = typeof pickupWindowTemplates.$inferSelect;
export type NewPickupWindowTemplate = typeof pickupWindowTemplates.$inferInsert;

export type PickupWindow = typeof pickupWindows.$inferSelect;
export type NewPickupWindow = typeof pickupWindows.$inferInsert;
