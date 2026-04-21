export function calcDiscount(type: string, amount: number, subtotal: number): number {
	if (type === 'percent') return Math.round(subtotal * (amount / 100));
	return Math.min(amount, subtotal);
}
