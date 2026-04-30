import type { PageServerLoad } from './$types';
import { getAvailableWindows } from '$lib/server/pickup/checkout';

export const load: PageServerLoad = async ({ params, locals }) => {
	const vendorId = locals.vendorId!;
	const availableWindows = await getAvailableWindows(vendorId);
	return { vendorSlug: params.vendorSlug, availableWindows };
};
