import {
	pgTable,
	serial,
	integer,
	varchar,
	text,
	boolean,
	timestamp,
	index
} from 'drizzle-orm/pg-core';
import { vendor } from './vendor';

export const promoCodes = pgTable(
	'promo_codes',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 50 }).notNull(),
		description: text('description'),
		type: varchar('type', { length: 10 }).notNull(),
		amount: integer('amount').notNull(),
		minOrderAmount: integer('min_order_amount').default(0).notNull(),
		maxUses: integer('max_uses'),
		usedCount: integer('used_count').default(0).notNull(),
		expiresAt: timestamp('expires_at'),
		isActive: boolean('is_active').default(true).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('promo_codes_vendor_idx').on(table.vendorId),
		index('promo_codes_code_idx').on(table.vendorId, table.code)
	]
);
