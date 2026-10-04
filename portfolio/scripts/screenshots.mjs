#!/usr/bin/env node
/**
 * Visual QA capture against a running production server.
 *   BASE_URL=http://localhost:3000 node scripts/screenshots.mjs [outDir]
 * Saves viewport + full-page screenshots for each route at desktop and
 * mobile widths, plus menu-open and hover states, and prints any console
 * errors, page errors or failed requests.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const out = process.argv[2] ?? 'docs/qa/screenshots';
mkdirSync(out, { recursive: true });

const routes = [
	['home', '/'],
	['work', '/work'],
	['work-grid', '/work?view=grid'],
	['project', '/work/soft-matter'],
	['project-3d', '/work/orbit-objects'],
	['about', '/about'],
	['contact', '/contact'],
	['privacy', '/privacy'],
	['404', '/work/does-not-exist'],
];
const viewports = [
	['desktop', { viewport: { width: 1440, height: 900 } }],
	['mobile', { ...devices['Pixel 7'] }],
];

const problems = [];
const browser = await chromium.launch();
for (const [vpName, ctxOpts] of viewports) {
	const context = await browser.newContext(ctxOpts);
	// Skip the once-per-session intro so every capture shows the page itself.
	await context.addInitScript(() => sessionStorage.setItem('preloaded', '1'));
	const page = await context.newPage();
	page.on('console', (m) => {
		// The deliberate 404 route logs its own status; anything else is a problem.
		if (m.type() === 'error' && !page.url().includes('does-not-exist'))
			problems.push(`[${vpName}] console: ${m.text()}`);
	});
	page.on('pageerror', (e) => problems.push(`[${vpName}] pageerror: ${e.message}`));
	page.on('requestfailed', (r) => {
		// Media elements cancel range requests (ERR_ABORTED) when paused or unloaded; that is expected.
		if (/\.(mp4|webm)$/.test(r.url()) && r.failure()?.errorText === 'net::ERR_ABORTED') return;
		problems.push(`[${vpName}] requestfailed: ${r.url()} ${r.failure()?.errorText}`);
	});
	page.on(
		'response',
		(r) =>
			r.status() >= 400 &&
			!r.url().includes('does-not-exist') &&
			problems.push(`[${vpName}] ${r.status()}: ${r.url()}`),
	);

	for (const [name, path] of routes) {
		await page.goto(base + path, { waitUntil: 'networkidle' });
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(400);
		await page.screenshot({ path: join(out, `${vpName}-${name}.png`) });
		// Scroll through so lazy media and reveals settle before the full-page shot.
		await page.evaluate(async () => {
			for (let y = 0; y < document.body.scrollHeight; y += 600) {
				window.scrollTo(0, y);
				await new Promise((r) => setTimeout(r, 60));
			}
			window.scrollTo(0, 0);
		});
		await page.waitForTimeout(500);
		await page.screenshot({ path: join(out, `${vpName}-${name}-full.png`), fullPage: true });
	}

	// Menu open state.
	await page.goto(base + '/', { waitUntil: 'networkidle' });
	if (vpName === 'desktop') {
		await page.evaluate(() => window.scrollTo(0, 900));
		await page.waitForTimeout(700);
		await page.getByRole('button', { name: 'Open menu' }).click();
	} else {
		await page.getByRole('button', { name: 'Menu', exact: true }).click();
	}
	await page.waitForTimeout(900);
	await page.screenshot({ path: join(out, `${vpName}-menu-open.png`) });

	if (vpName === 'desktop') {
		await page.keyboard.press('Escape');
		await page.goto(base + '/', { waitUntil: 'networkidle' });
		const row = page.locator('main ul a[href^="/work/"]').nth(1);
		await row.scrollIntoViewIfNeeded();
		const box = await row.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
			await page.mouse.move(box.x + box.width * 0.35, box.y + box.height / 2, { steps: 8 });
		}
		await page.waitForTimeout(900);
		await page.screenshot({ path: join(out, `${vpName}-work-hover.png`) });
	}
	await context.close();
}
await browser.close();

if (problems.length) {
	console.log(`${problems.length} problem(s):\n${problems.join('\n')}`);
	process.exitCode = 1;
} else {
	console.log('No console errors, page errors or failed requests.');
}
