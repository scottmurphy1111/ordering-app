import {
	pgTable,
	serial,
	integer,
	text,
	timestamp,
	jsonb,
	index,
	varchar,
	boolean
} from 'drizzle-orm/pg-core';
import {
	specialOrderRequestStateEnum,
	declinedByEnum,
	specialOrderPaymentStatusEnum
} from './types';
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
		declinedAt: timestamp('declined_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
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
		depositCents: integer('deposit_cents'), // null = pay in full (no deposit)
		balanceDueAt: timestamp('balance_due_at', { withTimezone: true }),
		message: text('message'),
		acceptToken: varchar('accept_token', { length: 64 }).notNull().unique(),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		acceptedAt: timestamp('accepted_at', { withTimezone: true }),
		declinedAt: timestamp('declined_at', { withTimezone: true }),
		sentByUserId: text('sent_by_user_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('special_order_quotes_request_id_idx').on(t.requestId),
		index('special_order_quotes_vendor_id_idx').on(t.vendorId),
		index('special_order_quotes_accept_token_idx').on(t.acceptToken)
	]
);

export const specialOrderPayments = pgTable(
	'special_order_payments',
	{
		id: serial('id').primaryKey(),
		// Plain integer — NOT .references(() => orders.id). orders.ts already imports
		// this file (specialOrderRequestId), so importing orders here would create a
		// circular import. Add the FK in relations.ts if desired.
		orderId: integer('order_id'),
		requestId: integer('request_id')
			.notNull()
			.references(() => specialOrderRequests.id),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id),
		label: text('label').notNull(), // 'Deposit' | 'Balance' | 'Payment'
		amountCents: integer('amount_cents').notNull(),
		dueAt: timestamp('due_at', { withTimezone: true }),
		status: specialOrderPaymentStatusEnum('status').notNull().default('scheduled'),
		payToken: varchar('pay_token', { length: 64 }).notNull().unique(),
		stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
		paidAt: timestamp('paid_at', { withTimezone: true }),
		lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }), // Phase 2
		reminderCount: integer('reminder_count').notNull().default(0), // Phase 2
		// Per-balance auto-reminder override. null = inherit the vendor default
		// (vendor.balanceRemindersEnabled). Gates sending only, never the overdue
		// status transition.
		remindersEnabled: boolean('reminders_enabled'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('special_order_payments_order_id_idx').on(t.orderId),
		index('special_order_payments_request_id_idx').on(t.requestId),
		index('special_order_payments_vendor_id_idx').on(t.vendorId),
		index('special_order_payments_pay_token_idx').on(t.payToken)
	]
);

export const specialOrderReminders = pgTable(
	'special_order_reminders',
	{
		id: serial('id').primaryKey(),
		paymentId: integer('payment_id')
			.notNull()
			.references(() => specialOrderPayments.id),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id),
		// 'upcoming_7d' | 'upcoming_1d' | 'overdue' | 'manual'
		kind: text('kind').notNull(),
		channel: text('channel').notNull().default('email'),
		sentTo: text('sent_to'),
		sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('special_order_reminders_payment_id_idx').on(t.paymentId)]
);
