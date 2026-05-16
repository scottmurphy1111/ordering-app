import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	// On a vendor subdomain, "/" should serve the catalog
	if (locals.vendor) throw redirect(301, '/catalog');
	// Logged-in users on the marketing/dashboard host go straight to the dashboard
	if (locals.user) throw redirect(302, '/vendors');
	// Guests see the marketing homepage
};
