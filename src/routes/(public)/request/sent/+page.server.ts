import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const vendor = locals.vendor!;
	if (!vendor.acceptsRequests) {
		throw redirect(303, '/catalog');
	}
	return { vendor };
};
