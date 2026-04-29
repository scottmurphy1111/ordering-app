import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = ({ cookies }) => {
	if (env.DEV_BYPASS_AUTH !== 'true') {
		throw redirect(303, '/login');
	}

	cookies.delete('dev_bypass_signout', { path: '/' });

	throw redirect(303, '/dashboard');
};
