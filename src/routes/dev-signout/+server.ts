import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = ({ cookies }) => {
	if (env.DEV_BYPASS_AUTH !== 'true') {
		throw redirect(303, '/login');
	}

	cookies.set('dev_bypass_signout', '1', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 // 24 hours
	});

	throw redirect(303, '/login');
};
