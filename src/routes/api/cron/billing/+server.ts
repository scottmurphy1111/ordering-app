import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runResumeDue, runPauseReminders, runPendingApprovalReminders, runReconcileSubscriptions } from '$lib/server/jobs';

export const GET: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET;
	const authHeader = request.headers.get('Authorization') ?? '';

	if (!secret || authHeader !== `Bearer ${secret}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const [resumeResult, reminderResult, pendingApprovalResult, reconcileResult] = await Promise.allSettled([
		runResumeDue(),
		runPauseReminders(),
		runPendingApprovalReminders(),
		runReconcileSubscriptions()
	]);

	const resume =
		resumeResult.status === 'fulfilled'
			? resumeResult.value
			: { processed: 0, errors: [String(resumeResult.reason)] };

	const reminders =
		reminderResult.status === 'fulfilled'
			? reminderResult.value
			: { processed: 0, errors: [String(reminderResult.reason)] };

	const pendingApproval =
		pendingApprovalResult.status === 'fulfilled'
			? pendingApprovalResult.value
			: { processed: 0, errors: [String(pendingApprovalResult.reason)] };

	const reconcile =
		reconcileResult.status === 'fulfilled'
			? reconcileResult.value
			: { processed: 0, drifted: 0, errors: [String(reconcileResult.reason)] };

	return json({ resume, reminders, pendingApproval, reconcile });
};
