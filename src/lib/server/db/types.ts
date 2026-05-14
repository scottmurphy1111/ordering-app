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

export const availabilityModeEnum = pgEnum('availability_mode', [
	'always',
	'storefront_only',
	'events_only',
	'special_order'
]);

export const specialOrderRequestStateEnum = pgEnum('special_order_request_state', [
	'pending',
	'quoted',
	'declined',
	'accepted',
	'expired'
]);

export const declinedByEnum = pgEnum('special_order_declined_by', ['vendor', 'customer']);
