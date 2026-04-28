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
		deliveryFee: integer('delivery_fee').default(0),
		tip: integer('tip').default(0),
		total: integer('total').notNull(),

		items: jsonb('items').notNull(),

		discount: integer('discount').default(0),
		promoCode: varchar('promo_code', { length: 50 }),

		deliveryAddress: text('delivery_address'),
		notes: text('notes'),
		scheduledFor: timestamp('scheduled_for'),
		estimatedReadyTime: timestamp('estimated_ready_time'),

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
