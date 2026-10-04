import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

/**
 * E2E against the production server (`pnpm build` first). Projects cover
 * Chromium, Firefox and WebKit on desktop plus Chromium/WebKit mobile
 * emulation. Emulation is not a real-device test.
 *
 * Run a subset with e.g. `pnpm test:e2e --project=chromium --project=mobile-chrome`.
 */
export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	workers: process.env.CI ? 2 : 3,
	reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
	use: {
		baseURL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
		{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
		{ name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
	],
	webServer: process.env.BASE_URL
		? undefined
		: {
				command: `pnpm start --port ${PORT}`,
				url: baseURL,
				reuseExistingServer: !process.env.CI,
				timeout: 60_000,
				// No provider credentials: the contact endpoint must report "not configured".
				env: { CONTACT_RATE_LIMIT_MAX: '3', CONTACT_RATE_LIMIT_WINDOW_SECONDS: '600', RESEND_API_KEY: '' },
			},
});
