import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runResumeDue, runPauseReminders, runPendingApprovalReminders } from '$lib/server/jobs';

export const GET: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET;
	const authHeader = request.headers.get('Authorization') ?? '';

	if (!secret || authHeader !== `Bearer ${secret}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const [resumeResult, reminderResult, pendingApprovalResult] = await Promise.allSettled([
		runResumeDue(),
		runPauseReminders(),
		runPendingApprovalReminders()
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

	return json({ resume, reminders, pendingApproval });
};
