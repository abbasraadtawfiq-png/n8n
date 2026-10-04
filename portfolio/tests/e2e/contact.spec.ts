import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function fill(page: Page, overrides: Partial<Record<'name' | 'email' | 'message', string>> = {}) {
	await page.getByLabel('What’s your name?').fill(overrides.name ?? 'Ada Lovelace');
	await page.getByLabel('What’s your email?').fill(overrides.email ?? 'ada@example.com');
	await page
		.getByLabel('Tell me about your project')
		.fill(overrides.message ?? 'A poster series for an exhibition.');
}

const submit = (page: Page) => page.getByRole('button', { name: /Send it!|Sending/ });

test.describe('contact form (UI)', () => {
	test('shows the honest unconfigured notice in this build', async ({ page }) => {
		await page.goto('/contact');
		await expect(
			page.getByRole('note').filter({ hasText: 'not connected to an email service' }),
		).toBeVisible();
	});

	test('inline validation with associated, announced errors', async ({ page }) => {
		await page.goto('/contact');
		await fill(page, { email: 'not-an-email', message: 'short' });
		await submit(page).click();
		const email = page.getByLabel('What’s your email?');
		await expect(email).toHaveAttribute('aria-invalid', 'true');
		await expect(email).toHaveAccessibleDescription('Please enter a valid email address.');
		await expect(email).toBeFocused();
		await expect(page.getByLabel('Tell me about your project')).toHaveAccessibleDescription(
			/at least 10 characters/,
		);
		await expect(page.getByRole('status')).toContainText('Please check the highlighted fields');
	});

	test('pending state blocks duplicates, then a mocked provider acceptance shows success', async ({
		page,
	}) => {
		let calls = 0;
		let release!: () => void;
		const gate = new Promise<void>((r) => (release = r));
		await page.route('**/api/contact', async (route) => {
			calls++;
			await gate;
			await route.fulfill({ status: 200, json: { ok: true } });
		});
		await page.goto('/contact');
		await fill(page);
		await submit(page).click();
		await expect(submit(page)).toHaveText('Sending…');
		await expect(submit(page)).toHaveAttribute('aria-disabled', 'true');
		// A second activation while pending must not send again (the button keeps focus).
		await expect(submit(page)).toBeFocused();
		await page.keyboard.press('Enter');
		release();
		await expect(page.getByRole('status')).toContainText('accepted for delivery');
		expect(calls).toBe(1);
		await expect(page.getByLabel('What’s your name?')).toHaveValue('');
	});

	test('provider failure, then retry succeeds', async ({ page }) => {
		let attempt = 0;
		await page.route('**/api/contact', (route) =>
			++attempt === 1
				? route.fulfill({ status: 502, json: { ok: false, code: 'provider_error' } })
				: route.fulfill({ status: 200, json: { ok: true } }),
		);
		await page.goto('/contact');
		await fill(page);
		await submit(page).click();
		await expect(page.getByRole('status')).toContainText('did not accept the message');
		await expect(page.getByLabel('What’s your name?')).toHaveValue('Ada Lovelace');
		await submit(page).click();
		await expect(page.getByRole('status')).toContainText('accepted for delivery');
	});

	test('network failure and rate limit messages', async ({ page }) => {
		await page.route('**/api/contact', (route) => route.abort('failed'));
		await page.goto('/contact');
		await fill(page);
		await submit(page).click();
		await expect(page.getByRole('status')).toContainText('connection failed');

		await page.unroute('**/api/contact');
		await page.route('**/api/contact', (route) =>
			route.fulfill({ status: 429, json: { ok: false, code: 'rate_limited', retryAfter: 300 } }),
		);
		await submit(page).click();
		await expect(page.getByRole('status')).toContainText('try again in about 5 minutes');
	});

	test('real endpoint without credentials reports "not sent" — never success', async ({ page }) => {
		await page.goto('/contact');
		await fill(page);
		await submit(page).click();
		await expect(page.getByRole('status')).toContainText('Not sent: the form is not connected');
	});
});

test.describe('contact endpoint (API)', () => {
	test.skip(({ browserName }) => browserName !== 'chromium', 'API checks are browser-independent');
	const body = { name: 'Ada', email: 'ada@example.com', message: 'Hello there, a project.' };

	test('rejects cross-origin posts and non-JSON bodies', async ({ request, baseURL }) => {
		const evil = await request.post('/api/contact', {
			data: body,
			headers: { Origin: 'https://evil.example', 'x-forwarded-for': '192.0.2.10' },
		});
		expect(evil.status()).toBe(403);
		const form = await request.post('/api/contact', {
			data: 'name=x',
			headers: {
				Origin: baseURL!,
				'Content-Type': 'application/x-www-form-urlencoded',
				'x-forwarded-for': '192.0.2.11',
			},
		});
		expect(form.status()).toBe(415);
	});

	test('validates, reports not_configured, then rate limits', async ({ request, baseURL }) => {
		const ip = `192.0.2.${100 + Math.floor(Math.random() * 100)}`;
		const headers = { Origin: baseURL!, 'x-forwarded-for': ip };
		const invalid = await request.post('/api/contact', { data: { ...body, email: 'nope' }, headers });
		expect(invalid.status()).toBe(400);
		const unconfigured = await request.post('/api/contact', { data: body, headers });
		expect(unconfigured.status()).toBe(503);
		expect(await unconfigured.json()).toMatchObject({ ok: false, code: 'not_configured' });
		await request.post('/api/contact', { data: body, headers });
		const limited = await request.post('/api/contact', { data: body, headers });
		expect(limited.status()).toBe(429);
		expect(limited.headers()['retry-after']).toBeTruthy();
	});

	test('no secrets or provider config leak into client assets', async ({ page }) => {
		const scripts: string[] = [];
		page.on('response', async (r) => {
			if (r.url().endsWith('.js')) scripts.push(await r.text());
		});
		await page.goto('/contact', { waitUntil: 'networkidle' });
		const html = await page.content();
		for (const text of [html, ...scripts]) {
			expect(text).not.toMatch(/RESEND_API_KEY|UPSTASH_REDIS_REST_TOKEN|re_[A-Za-z0-9]{16,}/);
			expect(text).not.toContain('api.resend.com');
		}
	});
});
