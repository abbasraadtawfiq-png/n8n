import { expect, test } from '@playwright/test';

test.describe('metadata and indexing (preview build)', () => {
	test.skip(({ browserName }) => browserName !== 'chromium', 'metadata is browser-independent');

	test('every page is noindex while the site is a preview', async ({ page, request }) => {
		for (const path of ['/', '/work', '/about', '/contact', '/work/soft-matter', '/privacy']) {
			await page.goto(path);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
			const res = await request.get(path);
			expect(res.headers()['x-robots-tag']).toBe('noindex');
		}
	});

	test('unique titles and descriptions', async ({ page }) => {
		const titles = new Set<string>();
		for (const path of ['/', '/work', '/about', '/contact', '/work/soft-matter', '/work/orbit-objects']) {
			await page.goto(path);
			titles.add(await page.title());
			await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{20,}/);
		}
		expect(titles.size).toBe(6);
	});

	test('no canonical or absolute URLs are invented without SITE_URL', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
		await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
		const html = await page.content();
		expect(html).not.toMatch(/example\.com|dennissnellenberg/);
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
	});

	test('sitemap excludes samples; robots allows crawling so noindex is visible', async ({ request }) => {
		const sitemap = await (await request.get('/sitemap.xml')).text();
		expect(sitemap).not.toContain('/work/');
		const robots = await (await request.get('/robots.txt')).text();
		expect(robots).toMatch(/Allow: \//);
		expect(robots).not.toMatch(/Sitemap:/);
	});

	test('security headers are present', async ({ request }) => {
		const h = (await request.get('/')).headers();
		expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
		expect(h['x-content-type-options']).toBe('nosniff');
		expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
		expect(h['x-powered-by']).toBeUndefined();
	});
});
