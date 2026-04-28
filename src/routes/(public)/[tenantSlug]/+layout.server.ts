import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.vendor) {
		throw error(404, 'Store not found');
	}
	return { vendor: locals.vendor };
};
