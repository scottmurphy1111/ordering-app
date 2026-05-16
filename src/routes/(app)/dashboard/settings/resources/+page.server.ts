import type { PageServerLoad } from './$types';
import { vendorUrl } from '$lib/server/vendor-origin';

export const load: PageServerLoad = async ({ locals }) => {
	const vendor = locals.vendor!;
	return {
		catalogUrl: vendorUrl(vendor.slug, '/catalog')
	};
};
