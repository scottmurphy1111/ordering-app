import { pgEnum } from 'drizzle-orm/pg-core';

// Enums for reusability
export const orderStatusEnum = pgEnum('order_status', [
	'received',
	'confirmed',
	'preparing',
	'ready',
	'fulfilled',
	'cancelled',
	'scheduled',
	'pending_approval',
	'payment_failed'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
	'pending',
	'paid',
	'failed',
	'refunded'
]);

export const pickupTypeEnum = pgEnum('pickup_type', ['windowed', 'custom_date']);
