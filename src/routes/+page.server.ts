import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { appUrl } from '$lib/server/app-origin';

export const load: PageServerLoad = ({ locals }) => {
	// On a vendor subdomain, "/" should serve the catalog
	if (locals.vendor) throw redirect(301, '/catalog');
	// Logged-in users on the apex/marketing host go to the dashboard host
	if (locals.user) throw redirect(302, appUrl('/vendors'));
	// Guests see the marketing homepage
};
