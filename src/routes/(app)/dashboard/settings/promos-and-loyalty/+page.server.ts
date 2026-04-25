import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, desc, count } from 'drizzle-orm';
import { promoCodes } from '$lib/server/db/schema';
import { tenant } from '$lib/server/db/tenant';
import { hasAddon } from '$lib/billing';
import { loyaltyAccounts, DEFAULT_LOYALTY_CONFIG } from '$lib/server/db/loyalty';
import type { LoyaltyConfig } from '$lib/server/db/loyalty';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;
	const tenantRecord = await db.query.tenant.findFirst({
		where: eq(tenant.id, tenantId),
		columns: { addons: true, settings: true }
	});

	const hasPromos = hasAddon(tenantRecord?.addons as string[] | null, 'promo_codes');
	const hasLoyalty = hasAddon(tenantRecord?.addons as string[] | null, 'loyalty');
	const settings = tenantRecord?.settings as Record<string, unknown> | null;
	const loyalty: LoyaltyConfig = (settings?.loyalty as LoyaltyConfig) ?? DEFAULT_LOYALTY_CONFIG;

	const codes = hasPromos
		? await db.query.promoCodes.findMany({
				where: eq(promoCodes.tenantId, tenantId),
				orderBy: [desc(promoCodes.createdAt)]
			})
		: [];

	const [memberCountRow] = hasLoyalty
		? await db.select({ value: count() }).from(loyaltyAccounts).where(eq(loyaltyAccounts.tenantId, tenantId))
		: [{ value: 0 }];

	const members = hasLoyalty
		? await db.query.loyaltyAccounts.findMany({
				where: eq(loyaltyAccounts.tenantId, tenantId),
				orderBy: [desc(loyaltyAccounts.updatedAt)]
			})
		: [];

	return { hasPromos, hasLoyalty, codes, loyalty, memberCount: memberCountRow.value, members };
};

export const actions: Actions = {
	// ── Promo code actions ────────────────────────────────────────────────────
	create: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const tenantRecord = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { addons: true }
		});
		if (!hasAddon(tenantRecord?.addons as string[] | null, 'promo_codes')) {
			return fail(403, { error: 'Promo codes add-on not active.' });
		}

		const fd = await request.formData();
		const code = fd.get('code')?.toString().trim().toUpperCase();
		const description = fd.get('description')?.toString().trim() || null;
		const type = fd.get('type')?.toString();
		const amountStr = fd.get('amount')?.toString();
		const minOrderStr = fd.get('minOrderAmount')?.toString();
		const maxUsesStr = fd.get('maxUses')?.toString();
		const expiresAtStr = fd.get('expiresAt')?.toString();

		if (!code) return fail(400, { error: 'Code is required.' });
		if (!/^[A-Z0-9_-]{2,20}$/.test(code))
			return fail(400, { error: 'Code must be 2–20 alphanumeric characters.' });
		if (type !== 'percent' && type !== 'flat') return fail(400, { error: 'Invalid type.' });

		const amount = parseFloat(amountStr ?? '');
		if (isNaN(amount) || amount <= 0) return fail(400, { error: 'Invalid amount.' });
		if (type === 'percent' && amount > 100) return fail(400, { error: 'Percent cannot exceed 100.' });

		const amountStored = type === 'percent' ? Math.round(amount) : Math.round(amount * 100);
		const minOrderAmount = Math.round(parseFloat(minOrderStr ?? '0') * 100) || 0;
		const maxUses = maxUsesStr ? parseInt(maxUsesStr) || null : null;
		const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

		const existing = await db.query.promoCodes.findFirst({
			where: and(eq(promoCodes.tenantId, tenantId), eq(promoCodes.code, code))
		});
		if (existing) return fail(400, { error: `Code "${code}" already exists.` });

		await db.insert(promoCodes).values({ tenantId, code, description, type, amount: amountStored, minOrderAmount, maxUses, expiresAt });
		return { success: true };
	},

	toggle: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const fd = await request.formData();
		const id = parseInt(fd.get('id')?.toString() ?? '');
		const isActive = fd.get('isActive') === 'true';
		if (isNaN(id)) return fail(400, { error: 'Invalid ID.' });
		await db.update(promoCodes).set({ isActive }).where(and(eq(promoCodes.id, id), eq(promoCodes.tenantId, tenantId)));
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const fd = await request.formData();
		const id = parseInt(fd.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid ID.' });
		await db.delete(promoCodes).where(and(eq(promoCodes.id, id), eq(promoCodes.tenantId, tenantId)));
		return { success: true };
	},

	// ── Loyalty actions ───────────────────────────────────────────────────────
	saveLoyalty: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const tenantRecord = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { addons: true, settings: true }
		});
		if (!hasAddon(tenantRecord?.addons as string[] | null, 'loyalty')) {
			return fail(403, { error: 'Loyalty add-on not active.' });
		}

		const fd = await request.formData();
		const type = fd.get('type')?.toString();
		if (type !== 'stamps' && type !== 'points') return fail(400, { error: 'Invalid type.' });

		const stampsPerOrder = parseInt(fd.get('stampsPerOrder')?.toString() ?? '1');
		const rewardAt = parseInt(fd.get('rewardAt')?.toString() ?? '10');
		const rewardDescription = fd.get('rewardDescription')?.toString().trim() || 'Free item';
		const pointsPerDollar = parseInt(fd.get('pointsPerDollar')?.toString() ?? '1');
		const redeemAt = parseInt(fd.get('redeemAt')?.toString() ?? '100');
		const redeemValueDollars = parseFloat(fd.get('redeemValue')?.toString() ?? '5');

		if (isNaN(stampsPerOrder) || stampsPerOrder < 1) return fail(400, { error: 'Stamps per order must be at least 1.' });
		if (isNaN(rewardAt) || rewardAt < 2) return fail(400, { error: 'Reward after must be at least 2.' });
		if (isNaN(pointsPerDollar) || pointsPerDollar < 1) return fail(400, { error: 'Points per dollar must be at least 1.' });
		if (isNaN(redeemAt) || redeemAt < 1) return fail(400, { error: 'Redeem at must be at least 1.' });
		if (isNaN(redeemValueDollars) || redeemValueDollars <= 0) return fail(400, { error: 'Redeem value must be greater than 0.' });

		const loyaltyConfig: LoyaltyConfig = {
			enabled: true,
			type,
			stamps: { stampsPerOrder, rewardAt, rewardDescription },
			points: { pointsPerDollar, redeemAt, redeemValue: Math.round(redeemValueDollars * 100) }
		};

		const currentSettings = (tenantRecord?.settings as Record<string, unknown>) ?? {};
		await db.update(tenant).set({ settings: { ...currentSettings, loyalty: loyaltyConfig }, updatedAt: new Date() }).where(eq(tenant.id, tenantId));
		return { success: true };
	},

	disableLoyalty: async ({ locals }) => {
		const tenantId = locals.tenantId!;
		const tenantRecord = await db.query.tenant.findFirst({
			where: eq(tenant.id, tenantId),
			columns: { settings: true }
		});
		const currentSettings = (tenantRecord?.settings as Record<string, unknown>) ?? {};
		const currentLoyalty = (currentSettings.loyalty as LoyaltyConfig) ?? DEFAULT_LOYALTY_CONFIG;
		await db.update(tenant).set({
			settings: { ...currentSettings, loyalty: { ...currentLoyalty, enabled: false } },
			updatedAt: new Date()
		}).where(eq(tenant.id, tenantId));
		return { success: true };
	}
};
