import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { orders } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, url }) => {
	const tenantId = locals.tenantId!;
	const statusFilter = url.searchParams.get('status') ?? '';

	const whereConditions = [eq(orders.tenantId, tenantId)];
	if (statusFilter) {
		whereConditions.push(eq(orders.status, statusFilter as typeof orders.status._.data));
	}

	const allOrders = await db.query.orders.findMany({
		where: and(...whereConditions),
		orderBy: [desc(orders.createdAt)],
		limit: 50,
		columns: {
			id: true,
			orderNumber: true,
			customerName: true,
			customerPhone: true,
			total: true,
			status: true,
			paymentStatus: true,
			type: true,
			createdAt: true,
			notes: true
		}
	});

	return { orders: allOrders, statusFilter };
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		const tenantId = locals.tenantId!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() ?? '');
		const status = formData.get('status')?.toString();
		if (isNaN(id) || !status) return fail(400, { error: 'Invalid' });

		await db
			.update(orders)
			.set({ status: status as typeof orders.status._.data, updatedAt: new Date() })
			.where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));

		return { success: true };
	}
};
