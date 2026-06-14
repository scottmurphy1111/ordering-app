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
	'deposit_paid',
	'paid',
	'failed',
	'refunded',
	'void'
]);

export const specialOrderPaymentStatusEnum = pgEnum('special_order_payment_status', [
	'scheduled',
	'paid',
	'overdue',
	'void'
]);

export const pickupTypeEnum = pgEnum('pickup_type', ['windowed', 'custom_date']);

export const pickupModeEnum = pgEnum('pickup_mode', [
	'pickup_event',
	'storefront_hours',
	'custom_date'
]);

export const specialOrderRequestStateEnum = pgEnum('special_order_request_state', [
	'pending',
	'quoted',
	'declined',
	'accepted',
	'expired'
]);

export const declinedByEnum = pgEnum('special_order_declined_by', ['vendor', 'customer']);
