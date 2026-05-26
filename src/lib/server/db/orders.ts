import {
	pgTable,
	serial,
	integer,
	varchar,
	text,
	timestamp,
	jsonb,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { vendor } from './vendor';
import { catalogItems } from './catalog';
import { orderStatusEnum, paymentStatusEnum, pickupTypeEnum, pickupModeEnum } from './types';
import { pickupWindows, pickupLocations } from './pickup';
import { specialOrderRequests } from './special-orders';

export const orders = pgTable(
	'orders',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),

		orderNumber: varchar('order_number', { length: 50 }).notNull(),

		customerName: varchar('customer_name', { length: 255 }),
		customerEmail: varchar('customer_email', { length: 255 }),
		customerPhone: varchar('customer_phone', { length: 20 }),

		type: varchar('type', { length: 20 }).notNull(),
		status: orderStatusEnum('status').default('received').notNull(),
		paymentStatus: paymentStatusEnum('payment_status').default('pending').notNull(),
		pickupType: pickupTypeEnum('pickup_type').default('windowed').notNull(),
		pickupMode: pickupModeEnum('pickup_mode').notNull().default('pickup_event'),

		subtotal: integer('subtotal').notNull(),
		tax: integer('tax').notNull(),
		tip: integer('tip').default(0),
		total: integer('total').notNull(),

		items: jsonb('items').notNull(),

		discount: integer('discount').default(0),
		promoCode: varchar('promo_code', { length: 50 }),

		notes: text('notes'),
		scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
		proposedDate: timestamp('proposed_date', { withTimezone: true }),
		proposedReason: text('proposed_reason'),
		proposedAt: timestamp('proposed_at', { withTimezone: true }),
		estimatedReadyTime: timestamp('estimated_ready_time', { withTimezone: true }),

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

		specialOrderRequestId: integer('special_order_request_id').references(
			() => specialOrderRequests.id,
			{ onDelete: 'set null' }
		),

		stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
		stripeSetupIntentId: varchar('stripe_setup_intent_id', { length: 255 }),
		stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
		stripePaymentMethodId: varchar('stripe_payment_method_id', { length: 255 }),
		metadata: jsonb('metadata').default({}),

		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		index('orders_vendor_idx').on(table.vendorId),
		index('orders_status_idx').on(table.vendorId, table.status),
		index('orders_created_idx').on(table.vendorId, table.createdAt),
		uniqueIndex('orders_vendor_id_order_number_unique').on(table.vendorId, table.orderNumber),
		index('orders_special_order_request_idx').on(table.specialOrderRequestId)
	]
);

export const orderItems = pgTable('order_items', {
	id: serial('id').primaryKey(),
	orderId: integer('order_id')
		.notNull()
		.references(() => orders.id, { onDelete: 'cascade' }),
	catalogItemId: integer('catalog_item_id').references(() => catalogItems.id, {
		onDelete: 'set null'
	}),

	name: varchar('name', { length: 255 }).notNull(),
	quantity: integer('quantity').notNull().default(1),
	unitPrice: integer('unit_price').notNull(),
	selectedModifiers: jsonb('selected_modifiers').default([]),
	notes: text('notes')
});
