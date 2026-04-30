import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { materializeAllActiveTemplates } from '$lib/server/pickup/materialize';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET;
	const authHeader = request.headers.get('Authorization') ?? '';

	if (!secret || authHeader !== `Bearer ${secret}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const result = await materializeAllActiveTemplates();
	return json(result);
};
