import { pgEnum } from 'drizzle-orm/pg-core';

// Enums for reusability
export const orderStatusEnum = pgEnum('order_status', [
	'received',
	'confirmed',
	'preparing',
	'ready',
	'fulfilled',
	'cancelled',
	'scheduled'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
	'pending',
	'paid',
	'failed',
	'refunded'
]);
