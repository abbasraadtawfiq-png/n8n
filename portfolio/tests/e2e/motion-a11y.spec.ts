import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/work', '/work/soft-matter', '/about', '/contact', '/privacy', '/work/missing-page'];

test.describe('accessibility (automated)', () => {
	for (const path of ROUTES) {
		test(`no serious or critical axe violations on ${path}`, async ({ page }) => {
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			// Scroll through so reveal-on-scroll content is in its final, visible state.
			await page.evaluate(async () => {
				for (let y = 0; y <= document.body.scrollHeight; y += 400) {
					window.scrollTo(0, y);
					await new Promise((r) => setTimeout(r, 40));
				}
			});
			await page.waitForTimeout(800);
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
			expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
		});
	}
});

test.describe('motion', () => {
	test('marquee moves by default and the pause control stops it', async ({ page }) => {
		await page.goto('/');
		const track = page.locator('[aria-hidden="true"] > div').filter({ hasText: 'Your Name' }).first();
		const read = () => track.evaluate((el) => getComputedStyle(el).transform);
		const a = await read();
		await page.waitForTimeout(400);
		expect(await read()).not.toBe(a);

		await page.getByRole('button', { name: 'Pause motion' }).click();
		await expect(page.getByRole('button', { name: 'Play motion' })).toHaveAttribute('aria-pressed', 'true');
		const b = await read();
		await page.waitForTimeout(400);
		expect(await read()).toBe(b);
	});

	test('reduced motion stops the marquee and hides the pause control', async ({ browser }) => {
		const context = await browser.newContext({ reducedMotion: 'reduce' });
		const page = await context.newPage();
		await page.goto('/');
		const track = page.locator('[aria-hidden="true"] > div').filter({ hasText: 'Your Name' }).first();
		const a = await track.evaluate((el) => getComputedStyle(el).transform);
		await page.waitForTimeout(500);
		expect(await track.evaluate((el) => getComputedStyle(el).transform)).toBe(a);
		await expect(page.getByRole('button', { name: 'Pause motion' })).toHaveCount(0);
		// Reveal-on-scroll content is shown immediately.
		await page.goto('/about');
		const service = page.locator('ol li').last();
		await service.scrollIntoViewIfNeeded();
		await expect(service).toHaveCSS('opacity', '1');
		await context.close();
	});

	test('fine pointer: hovering a work row shows the preview; leaving clears it', async ({ page }, info) => {
		test.skip(info.project.name.startsWith('mobile'), 'desktop only');
		await page.goto('/');
		const row = page.locator('main a[href="/work/soft-matter"]');
		await row.scrollIntoViewIfNeeded();
		const box = (await row.boundingBox())!;
		await page.mouse.move(box.x + 50, box.y + box.height / 2);
		await page.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 4 });
		const cursor = page.getByText('View', { exact: true });
		await expect(cursor).toBeVisible();
		await expect(cursor).toHaveAttribute('data-visible', 'true');
		await page.mouse.move(5, 5);
		await expect(cursor).not.toHaveAttribute('data-visible', 'true');
	});

	test('touch: rows show thumbnails, no hover preview exists', async ({ page }, info) => {
		test.skip(!info.project.name.startsWith('mobile'), 'touch only');
		await page.goto('/');
		const row = page.locator('main a[href="/work/soft-matter"]');
		await row.scrollIntoViewIfNeeded();
		await expect(row.locator('img')).toBeVisible();
		await expect(page.getByText('View', { exact: true })).toHaveCount(0);
		await row.tap();
		await expect(page).toHaveURL(/\/work\/soft-matter$/);
	});
});
