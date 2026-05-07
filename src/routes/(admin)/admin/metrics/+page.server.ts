import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, isNull, and, gte, count, sql } from 'drizzle-orm';
import { vendor } from '$lib/server/db/schema';

// Plan prices for MRR computation. Mirror src/lib/billing.ts TIERS but kept
// hardcoded here to avoid coupling the metrics page to billing internals.
// If TIERS prices change, this constant must be updated.
const PLAN_MONTHLY_PRICES: Record<string, number> = {
	market: 29,
	pro: 79
};

export const load: PageServerLoad = async () => {
	// Layout server already gates on isInternal.

	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	// Tier breakdown — count active non-deleted vendors per tier.
	const tierBreakdown = await db
		.select({
			tier: vendor.subscriptionTier,
			value: count()
		})
		.from(vendor)
		.where(and(isNull(vendor.deletedAt), eq(vendor.isActive, true)))
		.groupBy(vendor.subscriptionTier);

	const tierCounts = {
		starter: 0,
		market: 0,
		pro: 0
	};
	for (const row of tierBreakdown) {
		const t = row.tier ?? 'starter';
		if (t in tierCounts) tierCounts[t as keyof typeof tierCounts] = row.value;
	}

	// State breakdown — paused, cancel-scheduled, past-due, plain-active.
	// Single scan of paid vendors, classified server-side.
	const paidRows = await db
		.select({
			subscriptionStatus: vendor.subscriptionStatus,
			subscriptionEndsAt: vendor.subscriptionEndsAt,
			subscriptionPausedAt: vendor.subscriptionPausedAt
		})
		.from(vendor)
		.where(
			and(
				isNull(vendor.deletedAt),
				eq(vendor.isActive, true),
				sql`${vendor.subscriptionTier} != 'starter'`
			)
		);

	let paidActive = 0;
	let paused = 0;
	let cancelScheduled = 0;
	let pastDue = 0;
	for (const r of paidRows) {
		if (r.subscriptionPausedAt) paused++;
		else if (r.subscriptionStatus === 'past_due') pastDue++;
		else if (r.subscriptionEndsAt) cancelScheduled++;
		else paidActive++;
	}

	// MRR estimate — sum of monthly-equivalent prices for plain-active paid vendors.
	// Excludes paused (not billing), cancel-scheduled (winding down), past-due (failed).
	// Acknowledged imprecise: annual subs paid up front are counted at their monthly rate;
	// add-on revenue is not counted. Refined breakdown is a follow-up.
	const activeTierRows = await db
		.select({ tier: vendor.subscriptionTier, value: count() })
		.from(vendor)
		.where(
			and(
				isNull(vendor.deletedAt),
				eq(vendor.isActive, true),
				eq(vendor.subscriptionStatus, 'active'),
				isNull(vendor.subscriptionEndsAt),
				isNull(vendor.subscriptionPausedAt),
				sql`${vendor.subscriptionTier} != 'starter'`
			)
		)
		.groupBy(vendor.subscriptionTier);

	let mrrEstimate = 0;
	for (const row of activeTierRows) {
		const price = PLAN_MONTHLY_PRICES[row.tier ?? ''] ?? 0;
		mrrEstimate += price * row.value;
	}

	// Daily signups for the chart — last 30 days, bucketed by date.
	const signupsRaw = await db
		.select({
			day: sql<string>`to_char(date_trunc('day', ${vendor.createdAt}) at time zone 'UTC', 'YYYY-MM-DD')`,
			value: count()
		})
		.from(vendor)
		.where(and(isNull(vendor.deletedAt), gte(vendor.createdAt, thirtyDaysAgo)))
		.groupBy(sql`date_trunc('day', ${vendor.createdAt}) at time zone 'UTC'`);

	// Fill in gaps — every day in the window gets an entry, zero if no signups.
	const dailySignups: { date: string; count: number }[] = [];
	const signupMap = new Map(signupsRaw.map((r) => [r.day, r.value]));
	for (let i = 29; i >= 0; i--) {
		const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
		const yyyy = d.getUTCFullYear();
		const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
		const dd = String(d.getUTCDate()).padStart(2, '0');
		const key = `${yyyy}-${mm}-${dd}`;
		dailySignups.push({ date: key, count: signupMap.get(key) ?? 0 });
	}

	const totalSignupsLast30 = dailySignups.reduce((sum, d) => sum + d.count, 0);

	return {
		tierCounts,
		stateCounts: {
			paidActive,
			paused,
			cancelScheduled,
			pastDue
		},
		mrrEstimate,
		dailySignups,
		totalSignupsLast30
	};
};
