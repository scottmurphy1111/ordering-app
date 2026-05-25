import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { eq, and, gte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { effectiveHasAddon } from '$lib/billing';
import { resolveRange } from '$lib/server/analytics-range';

function csvEscape(v: string | number | null | undefined): string {
	if (v === null || v === undefined) return '';
	const s = String(v);
	if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const vendorId = locals.vendorId!;
	const hasAdvancedAnalytics = effectiveHasAddon(
		locals.vendor?.subscriptionTier ?? 'starter',
		locals.vendor?.addons,
		'analytics'
	);
	if (!hasAdvancedAnalytics) {
		throw error(403, 'Advanced Analytics required to export');
	}

	const { startOfRange, endOfRange, rangeDays } = resolveRange(url.searchParams);

	const rows = await db.query.orders.findMany({
		where: and(
			eq(orders.vendorId, vendorId),
			eq(orders.paymentStatus, 'paid'),
			gte(orders.createdAt, startOfRange),
			sql`${orders.createdAt} <= ${endOfRange}`
		),
		with: { items: true },
		orderBy: [orders.createdAt]
	});

	const header = [
		'Date',
		'Order Number',
		'Customer Name',
		'Customer Email',
		'Type',
		'Status',
		'Total (USD)',
		'Items'
	];

	const body = rows.map((o) =>
		[
			new Date(o.createdAt).toISOString().slice(0, 10),
			o.orderNumber ?? '',
			o.customerName ?? '',
			o.customerEmail ?? '',
			o.type ?? '',
			o.status ?? '',
			(o.total / 100).toFixed(2),
			(o.items ?? [])
				.map((it) => `${it.quantity} × ${it.name} @ $${(it.unitPrice / 100).toFixed(2)}`)
				.join('; ')
		]
			.map(csvEscape)
			.join(',')
	);

	const csv = [header.join(','), ...body].join('\n');
	const filename = `analytics-${rangeDays}d-${new Date().toISOString().slice(0, 10)}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
