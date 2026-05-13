export type AvailabilityMode = 'always' | 'storefront_only' | 'events_only' | 'special_order';

/**
 * Returns true when an item's availabilityMode is compatible with the chosen pickupMode.
 * 'always' is compatible with everything.
 * 'storefront_only' is incompatible with 'pickup_event'.
 * 'events_only' is incompatible with 'storefront_hours'.
 * 'special_order' items use custom_date pickup — no pickupMode applies.
 */
export function isCompatible(
	mode: AvailabilityMode,
	pickupMode: 'pickup_event' | 'storefront_hours' | 'custom_date' | undefined
): boolean {
	if (!pickupMode || mode === 'always' || mode === 'special_order') return true;
	if (mode === 'storefront_only' && pickupMode === 'pickup_event') return false;
	if (mode === 'events_only' && pickupMode === 'storefront_hours') return false;
	return true;
}
