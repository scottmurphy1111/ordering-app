/**
 * Computes the maximum custom-date lead time (in days) required by a list of items.
 *
 * For each item, `customDateLeadDays` represents the minimum number of days from
 * "today" before the customer can request that item. When multiple items are in
 * one cart, the cart's effective minimum lead time is the maximum across items.
 *
 * Fallback semantics:
 * - An item with no `customDateLeadDays` (null/undefined) falls back to 14 (matching
 *   the schema default in `catalogItems`).
 * - An empty input array returns 14 (cart-hydration default before items load).
 *
 * Used by both the client cart picker (for picker `min` and inline error copy)
 * and the server `/api/create-setup-intent` endpoint (for authoritative validation).
 * Keep the two consumers in sync by calling this function from both.
 */
export function computeMaxLeadDays(
	items: ReadonlyArray<{ customDateLeadDays?: number | null }>
): number {
	if (items.length === 0) return 14;
	return items.reduce((max, item) => Math.max(max, item.customDateLeadDays ?? 14), 0);
}
