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
import { tenant } from './tenant';

export const promoCodes = pgTable(
	'promo_codes',
	{
		id: serial('id').primaryKey(),
		tenantId: integer('tenant_id')
			.notNull()
			.references(() => tenant.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 50 }).notNull(),
		description: text('description'),
		type: varchar('type', { length: 10 }).notNull(), // 'percent' | 'flat'
		amount: integer('amount').notNull(), // percent (1-100) or cents
		minOrderAmount: integer('min_order_amount').default(0).notNull(),
		maxUses: integer('max_uses'), // null = unlimited
		usedCount: integer('used_count').default(0).notNull(),
		expiresAt: timestamp('expires_at'),
		isActive: boolean('is_active').default(true).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => ({
		tenantIdx: index('promo_codes_tenant_idx').on(table.tenantId),
		codeIdx: index('promo_codes_code_idx').on(table.tenantId, table.code)
	})
);
