import { test as base, expect } from '@playwright/test';

/**
 * Shared test setup: the once-per-session intro is marked as already seen so
 * it does not cover the page in every test (preloader.spec.ts tests it).
 */
export const test = base.extend({
	context: async ({ context }, provide) => {
		await context.addInitScript(() => {
			try {
				sessionStorage.setItem('preloaded', '1');
			} catch {
				/* ignore */
			}
		});
		await provide(context);
	},
});

export { expect };
