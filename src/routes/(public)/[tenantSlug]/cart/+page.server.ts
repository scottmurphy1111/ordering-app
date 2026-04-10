import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.tenant) throw error(404, 'Store not found');
	return { tenantSlug: params.tenantSlug };
};
