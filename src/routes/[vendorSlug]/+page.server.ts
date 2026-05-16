import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { vendorUrl } from '$lib/server/vendor-origin';

// Handles legacy path-based vendor URLs (getorderlocal.com/{slug}) and
// keeps `/${string}` in the typed-routes pathname union so that
// `resolve(path as `/${string}`)` casts work throughout the codebase.
export const load: PageServerLoad = ({ params }) => {
	throw redirect(301, vendorUrl(params.vendorSlug, '/catalog'));
};
