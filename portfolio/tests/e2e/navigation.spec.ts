import { expect, test } from '@playwright/test';

const isMobile = (name: string) => name.startsWith('mobile');

test.describe('home and navigation', () => {
	test('home is usable before gallery media finishes loading', async ({ page }) => {
		// Hold back every project image; the page must still be readable and navigable.
		await page.route('**/_next/image**', () => new Promise(() => undefined));
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Graphic Designer & 3D Artist');
		await expect(page.getByRole('link', { name: /Monolith Posters/ }).first()).toBeVisible();
		await expect(page.locator('main a[href="/about"]')).toBeVisible();
	});

	test('one h1 per page and a working skip link', async ({ page }) => {
		for (const path of ['/', '/work', '/about', '/contact', '/work/soft-matter', '/privacy']) {
			await page.goto(path);
			await expect(page.locator('h1')).toHaveCount(1);
		}
		await page.goto('/about');
		await page.keyboard.press('Tab');
		const skip = page.getByRole('link', { name: 'Skip to content' });
		await expect(skip).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#main$/);
	});

	test('header links navigate (desktop)', async ({ page }, info) => {
		test.skip(isMobile(info.project.name), 'header links collapse into the menu on mobile');
		await page.goto('/');
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Work' }).click();
		await expect(page).toHaveURL(/\/work$/);
		await expect(page.getByRole('link', { name: 'Work', exact: true }).first()).toHaveAttribute(
			'aria-current',
			'page',
		);
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About' }).click();
		await expect(page).toHaveURL(/\/about$/);
	});

	test('menu: keyboard open, Escape, focus return, scroll unlock', async ({ page }, info) => {
		await page.goto('/about');
		let trigger;
		if (isMobile(info.project.name)) {
			trigger = page.getByRole('button', { name: 'Menu', exact: true });
		} else {
			await page.mouse.wheel(0, 1200);
			trigger = page.getByRole('button', { name: 'Open menu' });
			await expect(trigger).toBeVisible();
		}
		await trigger.focus();
		await page.keyboard.press('Enter');
		const drawer = page.getByRole('navigation', { name: 'Navigation' });
		await expect(drawer.getByRole('link', { name: 'Home' })).toBeFocused();
		await expect(page.locator('html')).toHaveAttribute('data-menu-open', '');
		await expect(page.locator('main')).toHaveJSProperty('inert', true);

		// Focus stays within the menu.
		for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
		const inside = await page.evaluate(() =>
			Boolean(document.activeElement?.closest('nav[aria-label="Navigation"], button[aria-controls]')),
		);
		expect(inside).toBe(true);

		await page.keyboard.press('Escape');
		await expect(page.locator('html')).not.toHaveAttribute('data-menu-open', '');
		await expect(trigger).toBeFocused();
		await expect(page.locator('main')).toHaveJSProperty('inert', false);
		const overflow = await page.evaluate(() => getComputedStyle(document.documentElement).overflow);
		expect(overflow).not.toBe('hidden');
		// Closed drawer links are not focusable.
		await expect(drawer).toHaveJSProperty('inert', true);
	});

	test('menu: rapid toggling ends in a consistent state and navigation closes it', async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() => window.scrollTo(0, 1400));
		const floating = page.locator('button[aria-controls]');
		await expect(floating).toBeVisible();
		for (let i = 0; i < 5; i++) await floating.click();
		await expect(floating).toHaveAttribute('aria-expanded', 'true');
		await expect(page.locator('html')).toHaveAttribute('data-menu-open', '');
		await page.getByRole('navigation', { name: 'Navigation' }).getByRole('link', { name: 'Work' }).click();
		await expect(page).toHaveURL(/\/work$/);
		await expect(floating).toHaveAttribute('aria-expanded', 'false');
		await expect(page.locator('html')).not.toHaveAttribute('data-menu-open', '');
	});

	test('no horizontal overflow at common widths', async ({ page }, info) => {
		test.skip(info.project.name !== 'chromium', 'width sweep runs once');
		for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1920]) {
			await page.setViewportSize({ width, height: 900 });
			for (const path of ['/', '/work', '/work/soft-matter', '/about', '/contact']) {
				await page.goto(path);
				const overflow = await page.evaluate(
					() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
				);
				expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
			}
		}
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('primary content and links are still available', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Graphic Designer');
		await expect(page.getByText(/Graphic design and 3D imagery/)).toBeVisible();
		await page.goto('/work');
		await expect(page.locator('main a[href^="/work/"]')).toHaveCount(6);
		await page.locator('main a[href="/work/orbit-objects"]').click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Orbit Objects');
		await page.goto('/about');
		await expect(page.locator('ol li').first()).toBeVisible();
	});
});
