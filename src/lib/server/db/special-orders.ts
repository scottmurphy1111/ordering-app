import { pgTable, serial, integer, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { specialOrderRequestStateEnum } from './types';
import { vendor } from './vendor';

export const specialOrderRequests = pgTable(
	'special_order_requests',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		state: specialOrderRequestStateEnum('state').notNull().default('pending'),
		customerName: text('customer_name').notNull(),
		customerEmail: text('customer_email').notNull(),
		customerPhone: text('customer_phone'),
		description: text('description').notNull(),
		targetDate: text('target_date'), // YYYY-MM-DD, customer's requested date
		photoUrls: jsonb('photo_urls').$type<string[]>().notNull().default([]),
		declinedReason: text('declined_reason'),
		declinedAt: timestamp('declined_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		index('special_order_requests_vendor_id_idx').on(t.vendorId),
		index('special_order_requests_state_idx').on(t.state)
	]
);
