import type { Config } from '@netlify/functions';

export default async (_req: Request) => {
	const secret = Netlify.env.get('CRON_SECRET');

	if (!secret) {
		console.error('CRON_SECRET not configured in Netlify environment');
		return new Response('Server misconfigured', { status: 500 });
	}

	const siteUrl = 'https://getorderlocal.com';

	try {
		const response = await fetch(`${siteUrl}/api/cron/materialize`, {
			method: 'GET',
			headers: { Authorization: `Bearer ${secret}` }
		});

		const result = await response.json();

		if (!response.ok) {
			console.error('Materialize endpoint returned error', { status: response.status, result });
			return new Response('Endpoint error', { status: 500 });
		}

		console.log('Materialize completed', result);
		return new Response('OK', { status: 200 });
	} catch (err) {
		console.error('Failed to call materialize endpoint', err);
		return new Response('Failed', { status: 500 });
	}
};

export const config: Config = {
	schedule: '0 7 * * *' // 7am UTC daily — ~2-3am Eastern, low-traffic window
};
