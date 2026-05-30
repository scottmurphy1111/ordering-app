import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { systemEvents } from '$lib/server/db/system-events';
import { eq, ne, isNull, and, gte, count, desc, like } from 'drizzle-orm';
import { vendor } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	// Layout server already gates on isInternal — no auth check needed here.

	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const [
		activeCount,
		paidCount,
		recent30,
		recent7,
		lastResumeDue,
		lastPauseReminders,
		cronErrorsLast7,
		lastWebhookSuccess,
		webhookErrorsLast7,
		webhookTotalLast7,
		lastPendingApprovalReminders,
		lastReconcileSubscriptions
	] = await Promise.all([
		db
			.select({ value: count() })
			.from(vendor)
			.where(and(isNull(vendor.deletedAt), eq(vendor.isActive, true))),
		db
			.select({ value: count() })
			.from(vendor)
			.where(
				and(
					isNull(vendor.deletedAt),
					eq(vendor.isActive, true),
					ne(vendor.subscriptionTier, 'starter')
				)
			),
		db
			.select({ value: count() })
			.from(vendor)
			.where(and(isNull(vendor.deletedAt), gte(vendor.createdAt, thirtyDaysAgo))),
		db
			.select({ value: count() })
			.from(vendor)
			.where(and(isNull(vendor.deletedAt), gte(vendor.createdAt, sevenDaysAgo))),
		db
			.select({
				createdAt: systemEvents.createdAt,
				status: systemEvents.status,
				metadata: systemEvents.metadata
			})
			.from(systemEvents)
			.where(eq(systemEvents.eventType, 'cron.resume_due'))
			.orderBy(desc(systemEvents.createdAt))
			.limit(1),
		db
			.select({
				createdAt: systemEvents.createdAt,
				status: systemEvents.status,
				metadata: systemEvents.metadata
			})
			.from(systemEvents)
			.where(eq(systemEvents.eventType, 'cron.pause_reminders'))
			.orderBy(desc(systemEvents.createdAt))
			.limit(1),
		db
			.select({ value: count() })
			.from(systemEvents)
			.where(
				and(
					like(systemEvents.eventType, 'cron.%'),
					eq(systemEvents.status, 'error'),
					gte(systemEvents.createdAt, sevenDaysAgo)
				)
			),
		db
			.select({
				createdAt: systemEvents.createdAt,
				eventType: systemEvents.eventType
			})
			.from(systemEvents)
			.where(and(like(systemEvents.eventType, 'webhook.%'), eq(systemEvents.status, 'ok')))
			.orderBy(desc(systemEvents.createdAt))
			.limit(1),
		db
			.select({ value: count() })
			.from(systemEvents)
			.where(
				and(
					like(systemEvents.eventType, 'webhook.%'),
					eq(systemEvents.status, 'error'),
					gte(systemEvents.createdAt, sevenDaysAgo)
				)
			),
		db
			.select({ value: count() })
			.from(systemEvents)
			.where(
				and(like(systemEvents.eventType, 'webhook.%'), gte(systemEvents.createdAt, sevenDaysAgo))
			),
		db
			.select({
				createdAt: systemEvents.createdAt,
				status: systemEvents.status,
				metadata: systemEvents.metadata
			})
			.from(systemEvents)
			.where(eq(systemEvents.eventType, 'cron.pending_approval_reminders'))
			.orderBy(desc(systemEvents.createdAt))
			.limit(1),
		db
			.select({
				createdAt: systemEvents.createdAt,
				status: systemEvents.status,
				metadata: systemEvents.metadata
			})
			.from(systemEvents)
			.where(eq(systemEvents.eventType, 'cron.reconcile_subscriptions'))
			.orderBy(desc(systemEvents.createdAt))
			.limit(1)
	]);

	return {
		stats: {
			activeVendors: activeCount[0]?.value ?? 0,
			paidVendors: paidCount[0]?.value ?? 0,
			signupsLast30: recent30[0]?.value ?? 0,
			signupsLast7: recent7[0]?.value ?? 0
		},
		cronJobs: [
			{
				name: 'Resume due',
				eventType: 'cron.resume_due',
				lastRun: lastResumeDue[0]?.createdAt ?? null,
				lastStatus: lastResumeDue[0]?.status ?? null,
				lastMeta: (lastResumeDue[0]?.metadata ?? null) as {
					processed: number;
					drifted?: number;
					errors: string[];
				} | null
			},
			{
				name: 'Pause reminders',
				eventType: 'cron.pause_reminders',
				lastRun: lastPauseReminders[0]?.createdAt ?? null,
				lastStatus: lastPauseReminders[0]?.status ?? null,
				lastMeta: (lastPauseReminders[0]?.metadata ?? null) as {
					processed: number;
					drifted?: number;
					errors: string[];
				} | null
			},
			{
				name: 'Pending approval reminders',
				eventType: 'cron.pending_approval_reminders',
				lastRun: lastPendingApprovalReminders[0]?.createdAt ?? null,
				lastStatus: lastPendingApprovalReminders[0]?.status ?? null,
				lastMeta: (lastPendingApprovalReminders[0]?.metadata ?? null) as {
					processed: number;
					drifted?: number;
					errors: string[];
				} | null
			},
			{
				name: 'Reconcile subscriptions',
				eventType: 'cron.reconcile_subscriptions',
				lastRun: lastReconcileSubscriptions[0]?.createdAt ?? null,
				lastStatus: lastReconcileSubscriptions[0]?.status ?? null,
				lastMeta: (lastReconcileSubscriptions[0]?.metadata ?? null) as {
					processed: number;
					drifted?: number;
					errors: string[];
				} | null
			}
		],
		cronErrorsLast7: cronErrorsLast7[0]?.value ?? 0,
		webhookHealth: {
			lastSuccessAt: lastWebhookSuccess[0]?.createdAt ?? null,
			lastSuccessType: lastWebhookSuccess[0]?.eventType ?? null,
			errorsLast7: webhookErrorsLast7[0]?.value ?? 0,
			totalLast7: webhookTotalLast7[0]?.value ?? 0
		}
	};
};
