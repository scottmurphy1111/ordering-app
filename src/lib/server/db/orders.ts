import {
	pgTable,
	serial,
	integer,
	varchar,
	text,
	timestamp,
	jsonb,
	index
} from 'drizzle-orm/pg-core';
import { vendor } from './vendor';
import { catalogItems } from './catalog';
import { orderStatusEnum, paymentStatusEnum } from './types';
import { pickupWindows, pickupLocations } from './pickup';

export const orders = pgTable(
	'orders',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),

		orderNumber: varchar('order_number', { length: 50 }).unique().notNull(),

		customerName: varchar('customer_name', { length: 255 }),
		customerEmail: varchar('customer_email', { length: 255 }),
		customerPhone: varchar('customer_phone', { length: 20 }),

		type: varchar('type', { length: 20 }).notNull(),
		status: orderStatusEnum('status').default('received').notNull(),
		paymentStatus: paymentStatusEnum('payment_status').default('pending').notNull(),

		subtotal: integer('subtotal').notNull(),
		tax: integer('tax').notNull(),
		tip: integer('tip').default(0),
		total: integer('total').notNull(),

		items: jsonb('items').notNull(),

		discount: integer('discount').default(0),
		promoCode: varchar('promo_code', { length: 50 }),

		notes: text('notes'),
		scheduledFor: timestamp('scheduled_for'),
		estimatedReadyTime: timestamp('estimated_ready_time'),

		// Pickup Windows (Phase 1 — columns dormant until Phase 5 checkout integration)
		pickupWindowId: integer('pickup_window_id').references(() => pickupWindows.id, {
			onDelete: 'set null'
		}),
		pickupLocationId: integer('pickup_location_id').references(() => pickupLocations.id, {
			onDelete: 'set null'
		}),
		// Immutable snapshot of window/location data at order-creation time.
		// Source of truth for confirmation emails and customer receipts (Phase 5).
		pickupWindowSnapshot: jsonb('pickup_window_snapshot'),

		stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
		metadata: jsonb('metadata').default({}),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		index('orders_vendor_idx').on(table.vendorId),
		index('orders_status_idx').on(table.vendorId, table.status),
		index('orders_created_idx').on(table.vendorId, table.createdAt)
	]
);

export const orderItems = pgTable('order_items', {
	id: serial('id').primaryKey(),
	orderId: integer('order_id')
		.notNull()
		.references(() => orders.id, { onDelete: 'cascade' }),
	catalogItemId: integer('catalog_item_id').references(() => catalogItems.id),

	name: varchar('name', { length: 255 }).notNull(),
	quantity: integer('quantity').notNull().default(1),
	unitPrice: integer('unit_price').notNull(),
	selectedModifiers: jsonb('selected_modifiers').default([]),
	notes: text('notes')
});
