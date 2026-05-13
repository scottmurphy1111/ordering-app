import {
	pgTable,
	pgEnum,
	serial,
	integer,
	time,
	date,
	text,
	boolean,
	timestamp,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { vendor } from './vendor';

export const dayOfWeekEnum = pgEnum('day_of_week', [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday'
]);

/**
 * Weekly recurring operating hours. Multiple rows per (vendor_id, day_of_week)
 * allow split shifts (e.g., 7–11am, closed for prep, then 2–6pm).
 * Order rows by open_time when rendering.
 *
 * Times are wall-clock in the vendor's IANA timezone (vendor.timezone).
 * The isVendorOpen utility converts to absolute moments at read time.
 */
export const vendorHours = pgTable(
	'vendor_hours',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
		openTime: time('open_time').notNull(),
		closeTime: time('close_time').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('vendor_hours_vendor_idx').on(t.vendorId)]
);

/**
 * Date-specific overrides. Each row replaces weekly hours for that date.
 * If isClosed is true, the vendor is closed regardless of weekly hours.
 * The (vendor_id, date) unique constraint ensures one override per date.
 */
export const vendorHoursExceptions = pgTable(
	'vendor_hours_exceptions',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		date: date('date').notNull(),
		isClosed: boolean('is_closed').notNull().default(false),
		openTime: time('open_time'),
		closeTime: time('close_time'),
		note: text('note'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('vendor_hours_exceptions_vendor_date_unique').on(t.vendorId, t.date),
		index('vendor_hours_exceptions_vendor_idx').on(t.vendorId)
	]
);
