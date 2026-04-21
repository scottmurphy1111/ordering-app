import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { promoCodes } from '$lib/server/db/schema';

export function calcDiscount(type: string, amount: number, subtotal: number): number {
	if (type === 'percent') return Math.round(subtotal * (amount / 100));
	return Math.min(amount, subtotal); // flat: never exceed subtotal
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.tenantId) throw error(401, 'Unauthorized');

	const { code, subtotal } = await request.json() as { code: string; subtotal: number };
	if (!code?.trim()) return json({ valid: false, message: 'Enter a promo code.' });

	const promo = await db.query.promoCodes.findFirst({
		where: and(
			eq(promoCodes.tenantId, locals.tenantId),
			eq(promoCodes.code, code.trim().toUpperCase())
		)
	});

	if (!promo || !promo.isActive) {
		return json({ valid: false, message: 'Code not found or inactive.' });
	}
	if (promo.expiresAt && new Date() > promo.expiresAt) {
		return json({ valid: false, message: 'This code has expired.' });
	}
	if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
		return json({ valid: false, message: 'This code has reached its usage limit.' });
	}
	if (promo.minOrderAmount > 0 && subtotal < promo.minOrderAmount) {
		return json({
			valid: false,
			message: `Minimum order of $${(promo.minOrderAmount / 100).toFixed(2)} required.`
		});
	}

	const discount = calcDiscount(promo.type, promo.amount, subtotal);

	return json({
		valid: true,
		discount,
		description: promo.type === 'percent'
			? `${promo.amount}% off`
			: `$${(promo.amount / 100).toFixed(2)} off`,
		promoId: promo.id
	});
};
