import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { promoCodes } from '$lib/server/db/schema';
import { tenant } from '$lib/server/db/tenant';
import { hasAddon } from '$lib/billing';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;
	const tenantRecord = await db.query.tenant.findFirst({
		where: eq(tenant.id, tenantId),
		columns: { addons: true }
	});

	const hasAccess = hasAddon(tenantRecord?.addons as string[] | null, 'promo_codes');

	if (!hasAccess) return { hasAccess: false, codes: [] };

	const codes = await db.query.promoCodes.findMany({
		where: eq(promoCodes.tenantId, tenantId),
		orderBy: [desc(promoCodes.createdAt)]
	});

	return { hasAccess: true, codes };
};

export const actions: Actions = {
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
		if (!/^[A-Z0-9_-]{2,20}$/.test(code)) {
			return fail(400, { error: 'Code must be 2–20 alphanumeric characters.' });
		}
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

		await db.insert(promoCodes).values({
			tenantId, code, description, type, amount: amountStored,
			minOrderAmount, maxUses, expiresAt
		});

		return { success: true };
	},

	toggle: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const fd = await request.formData();
		const id = parseInt(fd.get('id')?.toString() ?? '');
		const isActive = fd.get('isActive') === 'true';
		if (isNaN(id)) return fail(400, { error: 'Invalid ID.' });
		await db.update(promoCodes)
			.set({ isActive })
			.where(and(eq(promoCodes.id, id), eq(promoCodes.tenantId, tenantId)));
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const fd = await request.formData();
		const id = parseInt(fd.get('id')?.toString() ?? '');
		if (isNaN(id)) return fail(400, { error: 'Invalid ID.' });
		await db.delete(promoCodes)
			.where(and(eq(promoCodes.id, id), eq(promoCodes.tenantId, tenantId)));
		return { success: true };
	}
};
