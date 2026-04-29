export const BUSINESS_TYPES = [
	{ value: 'bakery', label: 'Bakery' },
	{ value: 'farm', label: 'Farm / CSA' },
	{ value: 'butcher', label: 'Butcher' },
	{ value: 'florist', label: 'Florist' },
	{ value: 'brewery', label: 'Brewery' },
	{ value: 'coffee_shop', label: 'Coffee shop' },
	{ value: 'food_truck', label: 'Food truck' },
	{ value: 'specialty_maker', label: 'Specialty maker' },
	{ value: 'market_vendor', label: 'Market vendor' },
	{ value: 'other', label: 'Other' }
] as const;

export type BusinessTypeValue = (typeof BUSINESS_TYPES)[number]['value'];

const labelMap = Object.fromEntries(BUSINESS_TYPES.map((t) => [t.value, t.label])) as Record<
	string,
	string
>;

export function businessTypeLabel(value: string | null | undefined): string {
	if (!value) return '';
	return labelMap[value] ?? value;
}
