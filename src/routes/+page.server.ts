import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	// Logged-in users go straight to the dashboard
	if (locals.user) throw redirect(302, '/vendors');
	// Guests see the marketing homepage
};
