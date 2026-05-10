import { db } from '$lib/server/db';
import { vendor } from '$lib/server/db/vendor';
import { systemEvents } from '$lib/server/db/system-events';
import { and, isNotNull } from 'drizzle-orm';
import { sendEmail } from '$lib/server/email';
import { pauseReminderEmail } from '$lib/server/email/templates/pauseReminder';

export async function runPauseReminders(): Promise<{ processed: number; errors: string[] }> {
	const errors: string[] = [];
	let processed = 0;

	const todayUtcMidnight = new Date();
	todayUtcMidnight.setUTCHours(0, 0, 0, 0);

	const pausedVendors = await db.query.vendor.findMany({
		where: and(isNotNull(vendor.subscriptionPausedAt), isNotNull(vendor.pauseUntil)),
		columns: {
			id: true,
			name: true,
			email: true,
			subscriptionTier: true,
			pauseUntil: true
		}
	});

	for (const v of pausedVendors) {
		if (!v.pauseUntil || !v.email) continue;

		try {
			const resumeUtcMidnight = new Date(v.pauseUntil);
			resumeUtcMidnight.setUTCHours(0, 0, 0, 0);

			const daysOut = Math.round(
				(resumeUtcMidnight.getTime() - todayUtcMidnight.getTime()) / 86_400_000
			);

			if (daysOut !== 7 && daysOut !== 3 && daysOut !== 1) continue;

			const planName =
				(v.subscriptionTier ?? 'plan').charAt(0).toUpperCase() +
				(v.subscriptionTier ?? 'plan').slice(1);
			const pauseUntilStr = v.pauseUntil.toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			});

			await sendEmail({
				to: v.email,
				subject: `Your Order Local subscription resumes in ${daysOut} ${daysOut === 1 ? 'day' : 'days'}`,
				html: pauseReminderEmail({
					senderName: v.name,
					planName,
					pauseUntil: pauseUntilStr,
					daysRemaining: daysOut as 7 | 3 | 1
				})
			});

			processed++;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`vendor ${v.id}: ${msg}`);
			console.error(`[pause-reminders] failed vendor ${v.id}:`, err);
		}
	}

	if (processed > 0) console.log(`[pause-reminders] sent ${processed} reminder emails`);

	try {
		await db.insert(systemEvents).values({
			eventType: 'cron.pause_reminders',
			status: errors.length > 0 ? 'error' : 'ok',
			vendorId: null,
			metadata: { processed, errors }
		});
	} catch (e) {
		console.error('[pause-reminders] failed to record system event:', e);
	}

	return { processed, errors };
}
