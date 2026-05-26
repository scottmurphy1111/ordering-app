import {
	pgTable,
	serial,
	integer,
	text,
	varchar,
	timestamp,
	pgEnum,
	index
} from 'drizzle-orm/pg-core';
import { vendor } from './vendor';

export const notificationSeverityEnum = pgEnum('notification_severity', [
	'info',
	'warning',
	'critical'
]);

export const vendorNotifications = pgTable(
	'vendor_notifications',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		category: varchar('category', { length: 64 }).notNull(),
		title: text('title').notNull(),
		body: text('body').notNull(),
		severity: notificationSeverityEnum('severity').notNull().default('info'),
		actionUrl: text('action_url'),
		actionLabel: varchar('action_label', { length: 64 }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		readAt: timestamp('read_at', { withTimezone: true })
	},
	(t) => [
		index('vendor_notifications_vendor_idx').on(t.vendorId, t.createdAt),
		index('vendor_notifications_unread_idx').on(t.vendorId, t.readAt)
	]
);

export type VendorNotification = typeof vendorNotifications.$inferSelect;
export type NewVendorNotification = typeof vendorNotifications.$inferInsert;
