import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { materializeAllActiveTemplates } from '$lib/server/pickup/materialize';
import { transitionScheduledOrders } from '$lib/server/pickup/lifecycle';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET;
	const authHeader = request.headers.get('Authorization') ?? '';

	if (!secret || authHeader !== `Bearer ${secret}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const [materializeResult, transitionResult] = await Promise.allSettled([
		materializeAllActiveTemplates(),
		transitionScheduledOrders()
	]);

	const mat =
		materializeResult.status === 'fulfilled'
			? materializeResult.value
			: { templatesProcessed: 0, totalGenerated: 0, totalPreserved: 0, totalDeleted: 0, errors: [] };

	const trans =
		transitionResult.status === 'fulfilled'
			? transitionResult.value
			: { transitioned: 0, orderIds: [] };

	const errors = [
		...mat.errors,
		...(materializeResult.status === 'rejected'
			? [{ templateId: -1, error: String(materializeResult.reason) }]
			: []),
		...(transitionResult.status === 'rejected'
			? [{ templateId: -1, error: String(transitionResult.reason) }]
			: [])
	];

	return json({
		templatesProcessed: mat.templatesProcessed,
		totalGenerated: mat.totalGenerated,
		totalPreserved: mat.totalPreserved,
		totalDeleted: mat.totalDeleted,
		ordersTransitioned: trans.transitioned,
		errors
	});
};
