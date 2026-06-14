export type ItemChannels = {
	allowStoreHours: boolean;
	allowPickupEvents: boolean;
	allowCustomDate: boolean;
};

/**
 * Returns true when an item's fulfillment channels permit the chosen pickupMode.
 * pickup_event     → item must allow pickup events
 * storefront_hours → item must allow store hours
 * custom_date      → item must allow custom date
 * Undefined pickupMode (mode not yet chosen at the cart) is always compatible.
 */
export function isCompatible(
	channels: ItemChannels,
	pickupMode: 'pickup_event' | 'storefront_hours' | 'custom_date' | undefined
): boolean {
	if (!pickupMode) return true;
	if (pickupMode === 'pickup_event') return channels.allowPickupEvents;
	if (pickupMode === 'storefront_hours') return channels.allowStoreHours;
	if (pickupMode === 'custom_date') return channels.allowCustomDate;
	return true;
}
