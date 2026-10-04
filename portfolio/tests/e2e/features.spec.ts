import { test as base } from '@playwright/test';
import { expect, test } from './fixtures';

const desktop = (name: string) => !name.startsWith('mobile');

test.describe('page curtain', () => {
	test('covers with the destination name, then navigates and lifts', async ({ page }) => {
		await page.goto('/about');
		const curtain = page.locator('[data-phase]');
		await expect(curtain).toHaveAttribute('data-phase', 'idle');
		await page.locator('main a[href="/contact"]').first().click();
		await expect(curtain).toHaveAttribute('data-phase', /cover|covered/);
		await expect(curtain).toContainText('Contact');
		await expect(page).toHaveURL(/\/contact$/);
		await expect(curtain).toHaveAttribute('data-phase', 'idle', { timeout: 4000 });
		await expect(page.getByRole('heading', { level: 1 })).toContainText('project together');
	});

	test('is skipped for modified clicks, same-page links and reduced motion', async ({
		page,
		context,
		browser,
	}, info) => {
		test.skip(!desktop(info.project.name), 'modifier keys are desktop-only');
		await page.goto('/work');
		const [popup] = await Promise.all([
			context.waitForEvent('page'),
			page.locator('main a[href="/work/soft-matter"]').click({ modifiers: ['ControlOrMeta'] }),
		]);
		await popup.waitForURL(/soft-matter$/);
		await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase', 'idle');

		const reduced = await browser.newContext({ reducedMotion: 'reduce' });
		const p = await reduced.newPage();
		await p.goto('/about');
		await p.locator('main a[href="/contact"]').first().click();
		await expect(p).toHaveURL(/\/contact$/);
		await expect(p.locator('[data-phase]')).toHaveAttribute('data-phase', 'idle');
		await reduced.close();
	});
});

base.describe('intro preloader', () => {
	base('plays once per tab session and never with reduced motion', async ({ page, browser }) => {
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('data-preload', 'run');
		await expect(page.getByText('Hello', { exact: true })).toBeVisible();
		await expect(page.locator('html')).not.toHaveAttribute('data-preload', 'run', { timeout: 4000 });
		await page.reload();
		await expect(page.locator('html')).not.toHaveAttribute('data-preload', 'run');

		const reduced = await browser.newContext({ reducedMotion: 'reduce' });
		const p = await reduced.newPage();
		await p.goto('/');
		await expect(p.locator('html')).not.toHaveAttribute('data-preload', 'run');
		await reduced.close();
	});

	base('is absent without JavaScript', async ({ browser }) => {
		const ctx = await browser.newContext({ javaScriptEnabled: false });
		const p = await ctx.newPage();
		await p.goto('/');
		await expect(p.getByText('Hello', { exact: true })).toBeHidden();
		await ctx.close();
	});
});

test.describe('headline reveal', () => {
	test('headline words end up visible (and are plain text in the HTML)', async ({ page }) => {
		await page.goto('/work');
		const h1 = page.getByRole('heading', { level: 1 });
		await expect(h1).toHaveText('Selected graphic design & 3D work');
		await expect(h1).toHaveAttribute('data-revealed', '');
		const lastWord = h1.locator('.split-word').last();
		await expect(lastWord).toHaveCSS('transform', /none|matrix\(1, 0, 0, 1, 0, 0\)/, { timeout: 3000 });
	});
});

test.describe('project media', () => {
	test('gallery lightbox: open, step with keys, close with Escape, focus returns', async ({ page }) => {
		await page.goto('/work/monolith-posters');
		const first = page.locator('a[data-lightbox-index]').first();
		await first.scrollIntoViewIfNeeded();
		await first.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAttribute('aria-label', /1 \/ 3/);
		await page.keyboard.press('ArrowRight');
		await expect(dialog).toHaveAttribute('aria-label', /2 \/ 3/);
		await page.keyboard.press('ArrowLeft');
		await page.keyboard.press('ArrowLeft');
		await expect(dialog).toHaveAttribute('aria-label', /3 \/ 3/);
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(first).toBeFocused();
	});

	test('lightbox images are real links without JavaScript', async ({ browser }) => {
		const ctx = await browser.newContext({ javaScriptEnabled: false });
		const p = await ctx.newPage();
		await p.goto('/work/monolith-posters');
		const href = await p.locator('a[data-lightbox-index]').first().getAttribute('href');
		expect(href).toMatch(/^\/media\/projects\/monolith-posters\/.+\.jpg$/);
		await ctx.close();
	});

	test('before/after slider responds to keyboard', async ({ page }) => {
		await page.goto('/work/orbit-objects');
		const range = page.getByRole('slider', { name: /Drag to compare/ });
		await range.scrollIntoViewIfNeeded();
		await range.focus();
		await page.keyboard.press('Home');
		await expect(range).toHaveValue('0');
		await page.keyboard.press('End');
		await expect(range).toHaveValue('100');
		await expect(range).toHaveAttribute('aria-valuetext', /100% Wireframe/);
	});

	test('3D model loads only on request', async ({ page }, info) => {
		test.skip(info.project.name !== 'chromium', 'WebGL check runs once');
		const glb: string[] = [];
		page.on('request', (r) => r.url().endsWith('.glb') && glb.push(r.url()));
		await page.goto('/work/orbit-objects');
		const button = page.getByRole('button', { name: 'View in 3D' });
		await button.scrollIntoViewIfNeeded();
		expect(glb).toHaveLength(0);
		await button.click();
		await expect(page.locator('[data-state="ready"]')).toBeVisible({ timeout: 20000 });
		expect(glb.length).toBeGreaterThan(0);
	});
});

test.describe('work index animation', () => {
	test('filter results re-render and animate in', async ({ page }) => {
		await page.goto('/work');
		await page.getByRole('button', { name: /^Art Direction/ }).click();
		const items = page.locator('main li[data-category]');
		await expect(items).toHaveCount(2);
		const name = await items.first().evaluate((el) => getComputedStyle(el).animationName);
		expect(name).toContain('result-in');
	});
});

test.describe('CMS admin', () => {
	test('is not reachable on a production server without GitHub mode', async ({ request }) => {
		expect((await request.get('/keystatic')).status()).toBe(404);
		expect((await request.get('/api/keystatic/tree')).status()).toBe(404);
	});
});
