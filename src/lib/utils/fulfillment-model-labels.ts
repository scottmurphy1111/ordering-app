export const FULFILLMENT_MODELS = [
	{
		value: 'storefront',
		label: 'Storefront',
		description:
			'You have a physical location with regular operating hours. Customers walk in and order in-store or place online orders for same-day or near-term pickup during open hours. Occasional preorder events (holiday pies, wedding cakes) are possible alongside walk-in retail.'
	},
	{
		value: 'pickup_only',
		label: 'Pickup only',
		description:
			"You don't have a walk-in storefront. All orders are placed ahead and picked up at scheduled handoff times — recurring (Saturday farmers market, weekly CSA pickup) or one-off (food truck pop-up at a specific location). The pickup event is the unit of fulfillment."
	},
	{
		value: 'hybrid',
		label: 'Both',
		description:
			"You have a storefront AND offer scheduled pickup events. A bakery with regular shop hours that also sells at the Saturday farmers market, for example. You'll be able to set both operating hours and pickup events, and mark which catalog items are available where."
	}
] as const;

export type FulfillmentModelValue = (typeof FULFILLMENT_MODELS)[number]['value'];

const labelMap = Object.fromEntries(FULFILLMENT_MODELS.map((m) => [m.value, m.label])) as Record<
	string,
	string
>;

export function fulfillmentModelLabel(value: string | null | undefined): string {
	if (!value) return '';
	return labelMap[value] ?? value;
}
