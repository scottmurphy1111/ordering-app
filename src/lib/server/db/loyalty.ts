import {
	pgTable,
	serial,
	integer,
	varchar,
	timestamp,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';
import { vendor } from './vendor';

export const loyaltyAccounts = pgTable(
	'loyalty_accounts',
	{
		id: serial('id').primaryKey(),
		vendorId: integer('vendor_id')
			.notNull()
			.references(() => vendor.id, { onDelete: 'cascade' }),
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
		uniqueIndex('loyalty_accounts_vendor_email_idx').on(table.vendorId, table.email),
		index('loyalty_accounts_vendor_idx').on(table.vendorId)
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
		redeemValue: number;
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
