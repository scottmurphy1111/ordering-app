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
	'refunded',
	'void'
]);

export const pickupTypeEnum = pgEnum('pickup_type', ['windowed', 'custom_date']);

export const pickupModeEnum = pgEnum('pickup_mode', [
	'pickup_event',
	'storefront_hours',
	'custom_date'
]);
