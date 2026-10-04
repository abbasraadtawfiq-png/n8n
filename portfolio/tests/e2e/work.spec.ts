import { expect, test } from '@playwright/test';

test.describe('work and projects', () => {
	test('category filters show the right projects and persist in the URL', async ({ page }) => {
		await page.goto('/work');
		const rows = page.locator('main a[href^="/work/"]');
		await expect(rows).toHaveCount(6);

		await page.getByRole('button', { name: /^3D/ }).click();
		await expect(page).toHaveURL(/category=3d/);
		await expect(rows).toHaveCount(2);
		await expect(page.getByRole('button', { name: /^3D/ })).toHaveAttribute('aria-pressed', 'true');
		await expect(page.getByRole('status')).toHaveText('2 projects');

		await page.reload();
		await expect(rows).toHaveCount(2);

		await rows.first().click();
		await expect(page).toHaveURL(/\/work\/soft-matter$/);
		await page.goBack();
		await expect(page).toHaveURL(/category=3d/);
		await expect(rows).toHaveCount(2);

		await page.getByRole('button', { name: /^All/ }).click();
		await expect(rows).toHaveCount(6);
	});

	test('grid view toggle', async ({ page }, info) => {
		test.skip(info.project.name.startsWith('mobile'), 'layout toggle is hidden on small screens');
		await page.goto('/work');
		await page.getByRole('button', { name: 'Grid view' }).click();
		await expect(page).toHaveURL(/view=grid/);
		await expect(page.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
		await expect(page.locator('main a[href^="/work/"]')).toHaveCount(6);
	});

	test('cards open the matching project; next project and back to work', async ({ page }) => {
		await page.goto('/work');
		await page.locator('main a[href="/work/night-market-identity"]').click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Night Market');
		await expect(page).toHaveTitle(/Night Market identity \(sample\)/);

		await page.reload();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Night Market');

		await page
			.getByRole('navigation', { name: 'Next case' })
			.getByRole('link', { name: /Orbit Objects/ })
			.click();
		await expect(page).toHaveURL(/\/work\/orbit-objects$/);
		await page.goBack();
		await expect(page).toHaveURL(/\/work\/night-market-identity$/);
		await page.goForward();
		await expect(page).toHaveURL(/\/work\/orbit-objects$/);

		await page.getByRole('link', { name: 'All work' }).click();
		await expect(page).toHaveURL(/\/work$/);
	});

	test('last project wraps to the first as next case', async ({ page }) => {
		await page.goto('/work/signal-type');
		await expect(
			page.getByRole('navigation', { name: 'Next case' }).getByRole('link', { name: /Monolith Posters/ }),
		).toBeVisible();
	});

	test('sample projects are labelled', async ({ page }) => {
		await page.goto('/work/soft-matter');
		await expect(page.getByRole('note').filter({ hasText: 'Not a real commission' })).toBeVisible();
	});

	test('unknown slugs are a real 404', async ({ page }) => {
		const res = await page.goto('/work/this-does-not-exist');
		expect(res?.status()).toBe(404);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
		const robots = await page
			.locator('meta[name="robots"]')
			.evaluateAll((els) => els.map((e) => e.getAttribute('content')));
		expect(robots.length).toBeGreaterThan(0);
		for (const r of robots) expect(r).toMatch(/noindex/);
	});

	test('modified click opens a project in a new tab', async ({ page, context }, info) => {
		test.skip(info.project.name.startsWith('mobile'), 'no modifier keys on touch');
		await page.goto('/work');
		const modifier = info.project.name === 'webkit' ? 'Meta' : 'ControlOrMeta';
		const [popup] = await Promise.all([
			context.waitForEvent('page'),
			page.locator('main a[href="/work/soft-matter"]').click({ modifiers: [modifier] }),
		]);
		await popup.waitForURL(/\/work\/soft-matter$/);
		await expect(page).toHaveURL(/\/work$/);
	});
});
