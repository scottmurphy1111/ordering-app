import {
	pgTable,
	serial,
	integer,
	text,
	timestamp,
	jsonb,
	index,
	varchar
} from 'drizzle-orm/pg-core';
import { specialOrderRequestStateEnum, declinedByEnum } from './types';
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
		declinedBy: declinedByEnum('declined_by'),
		declinedAt: timestamp('declined_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [
		index('special_order_requests_vendor_id_idx').on(t.vendorId),
		index('special_order_requests_state_idx').on(t.state)
	]
);

export const specialOrderQuotes = pgTable(
	'special_order_quotes',
	{
		id: serial('id').primaryKey(),
		requestId: integer('request_id')
			.notNull()
			.references(() => specialOrderRequests.id, { onDelete: 'cascade' }),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		priceCents: integer('price_cents').notNull(),
		message: text('message'),
		acceptToken: varchar('accept_token', { length: 64 }).notNull().unique(),
		expiresAt: timestamp('expires_at'),
		acceptedAt: timestamp('accepted_at'),
		declinedAt: timestamp('declined_at'),
		sentByUserId: text('sent_by_user_id'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => [
		index('special_order_quotes_request_id_idx').on(t.requestId),
		index('special_order_quotes_vendor_id_idx').on(t.vendorId),
		index('special_order_quotes_accept_token_idx').on(t.acceptToken)
	]
);
