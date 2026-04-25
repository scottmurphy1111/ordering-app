import {
	pgTable,
	serial,
	integer,
	varchar,
	timestamp,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';
import { tenant } from './tenant';

export const loyaltyAccounts = pgTable(
	'loyalty_accounts',
	{
		id: serial('id').primaryKey(),
		tenantId: integer('tenant_id')
			.notNull()
			.references(() => tenant.id, { onDelete: 'cascade' }),
		email: varchar('email', { length: 255 }).notNull(),
		name: varchar('name', { length: 255 }),
		currentStamps: integer('current_stamps').default(0).notNull(),
		totalStampsEarned: integer('total_stamps_earned').default(0).notNull(),
		currentPoints: integer('current_points').default(0).notNull(),
		totalPointsEarned: integer('total_points_earned').default(0).notNull(),
		totalRewardsEarned: integer('total_rewards_earned').default(0).notNull(),
		lastOrderAt: timestamp('last_order_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('loyalty_accounts_tenant_email_idx').on(table.tenantId, table.email),
		index('loyalty_accounts_tenant_idx').on(table.tenantId)
	]
);

export type LoyaltyAccount = typeof loyaltyAccounts.$inferSelect;
export type NewLoyaltyAccount = typeof loyaltyAccounts.$inferInsert;

export interface LoyaltyConfig {
	enabled: boolean;
	type: 'stamps' | 'points';
	stamps: {
		stampsPerOrder: number;
		rewardAt: number;
		rewardDescription: string;
	};
	points: {
		pointsPerDollar: number;
		redeemAt: number;
		redeemValue: number; // cents
	};
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
	enabled: false,
	type: 'stamps',
	stamps: {
		stampsPerOrder: 1,
		rewardAt: 10,
		rewardDescription: 'Free item up to $15'
	},
	points: {
		pointsPerDollar: 1,
		redeemAt: 100,
		redeemValue: 500
	}
};
