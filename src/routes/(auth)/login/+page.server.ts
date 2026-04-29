import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		return redirect(302, '/vendors');
	}
	return { isDevBypass: env.DEV_BYPASS_AUTH === 'true' };
};
