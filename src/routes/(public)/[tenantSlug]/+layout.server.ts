import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.tenant) {
		throw error(404, 'Store not found');
	}
	return { tenant: locals.tenant };
};
