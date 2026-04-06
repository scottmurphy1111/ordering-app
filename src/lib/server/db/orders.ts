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
import { tenant, menuItems } from './schema';
import { orderStatusEnum, paymentStatusEnum } from './types';

export const orders = pgTable(
	'orders',
	{
		id: serial('id').primaryKey(),
		tenantId: integer('tenant_id')
			.notNull()
			.references(() => tenant.id, { onDelete: 'cascade' }),

		orderNumber: varchar('order_number', { length: 50 }).unique().notNull(), // e.g., #ORD-12345

		customerName: varchar('customer_name', { length: 255 }),
		customerEmail: varchar('customer_email', { length: 255 }),
		customerPhone: varchar('customer_phone', { length: 20 }),

		type: varchar('type', { length: 20 }).notNull(), // "pickup", "delivery", "dine-in"
		status: orderStatusEnum('status').default('received').notNull(),
		paymentStatus: paymentStatusEnum('payment_status').default('pending').notNull(),

		subtotal: integer('subtotal').notNull(), // cents
		tax: integer('tax').notNull(),
		deliveryFee: integer('delivery_fee').default(0),
		tip: integer('tip').default(0),
		total: integer('total').notNull(),

		items: jsonb('items').notNull(), // snapshot of ordered items with selected modifiers for auditability
		// Alternative: normalize into order_items table (see below)

		notes: text('notes'),
		estimatedReadyTime: timestamp('estimated_ready_time'),

		stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }), // for webhooks
		metadata: jsonb('metadata').default({}), // any extra data

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => ({
		tenantIdx: index('orders_tenant_idx').on(table.tenantId),
		statusIdx: index('orders_status_idx').on(table.tenantId, table.status),
		createdIdx: index('orders_created_idx').on(table.tenantId, table.createdAt)
	})
);

// Normalized order items (recommended for analytics/reporting)
export const orderItems = pgTable('order_items', {
	id: serial('id').primaryKey(),
	orderId: integer('order_id')
		.notNull()
		.references(() => orders.id, { onDelete: 'cascade' }),
	menuItemId: integer('menu_item_id').references(() => menuItems.id), // optional link

	name: varchar('name', { length: 255 }).notNull(),
	quantity: integer('quantity').notNull().default(1),
	unitPrice: integer('unit_price').notNull(), // cents at time of order
	selectedModifiers: jsonb('selected_modifiers').default([]), // snapshot of choices
	notes: text('notes')
});
