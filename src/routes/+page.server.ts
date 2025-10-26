import type { PageServerLoad } from './$types';

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

export const actions = {
	processFile: async ({ request }) => {
		const formData = await request.formData();
		const file = (await formData.get('file')) as File;
		return {
			gotoStep: 3
		};
	}
};
