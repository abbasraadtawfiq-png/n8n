#!/usr/bin/env node
/**
 * Builds a single-file, interactive PREVIEW of the portfolio for hosts that
 * cannot run Next.js (e.g. a Claude artifact). It snapshots the rendered HTML
 * of every route from a running production server, inlines the compiled
 * CSS, fonts, images and video as data URIs, rewrites internal links to
 * in-page routes (#work, #p-<slug>, …) and adds runtime.js, a small script
 * that reproduces the site's interactions. The contact form cannot send.
 *
 *   pnpm build && pnpm start --port 3100 &
 *   BASE_URL=http://localhost:3100 node scripts/preview-artifact/build.mjs out/preview.html
 *
 * This is a preview mirror only; the deployable site is the Next.js app.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '../..');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const outFile = resolve(process.argv[2] ?? join(root, 'out', 'preview.html'));

const slugs = [
	...readFileSync(join(root, 'src/content/projects.ts'), 'utf8').matchAll(/slug: '([a-z0-9-]+)'/g),
].map((m) => m[1]);
const routes = [
	['home', '/'],
	['work', '/work'],
	['about', '/about'],
	['contact', '/contact'],
	['privacy', '/privacy'],
	['notfound', '/work/__missing__'],
	...slugs.map((s) => [`p-${s}`, `/work/${s}`]),
];

const toHash = (href) => {
	const path = href.split('?')[0].replace(/\/$/, '') || '/';
	if (path === '/') return '#home';
	const m = path.match(/^\/work\/([a-z0-9-]+)$/);
	if (m) return `#p-${m[1]}`;
	if (['/work', '/about', '/contact', '/privacy'].includes(path)) return `#${path.slice(1)}`;
	return '#notfound';
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const css = new Set();
const snapshots = {};
let chrome = null;

async function capture(path) {
	if (path) {
		await page.goto(base + path, { waitUntil: 'networkidle' });
		await page.waitForTimeout(400);
	}
	return page.evaluate(() => {
		// Drop runtime-only state so the runtime starts clean.
		document.querySelectorAll('[style*="translate"]').forEach((el) => {
			el.style.removeProperty('transform');
			el.style.removeProperty('translate');
			el.style.removeProperty('rotate');
			el.style.removeProperty('scale');
			if (!el.getAttribute('style')) el.removeAttribute('style');
		});
		document.querySelectorAll('[data-revealed]').forEach((el) => el.removeAttribute('data-revealed'));
		const kids = [...document.body.children];
		const top = kids.find((el) => el.querySelector('header'));
		const menu = kids.find((el) => el.querySelector('button[aria-controls]'));
		const content = kids.filter(
			(el) =>
				el !== top &&
				el !== menu &&
				!['SCRIPT', 'TEMPLATE', 'NEXT-ROUTE-ANNOUNCER', 'LINK'].includes(el.tagName) &&
				!el.classList.contains('skip-link') &&
				el.id !== 'scroll-sentinel',
		);
		return {
			title: document.title,
			htmlClass: document.documentElement.className,
			top: top?.outerHTML ?? '',
			menu: menu?.outerHTML ?? '',
			content: content.map((el) => el.outerHTML).join('\n'),
			css: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
		};
	});
}

for (const [key, path] of routes) {
	if (key === 'work') {
		// Capture the grid view too and keep it (hidden) next to the list for the runtime toggle.
		await page.goto(base + path, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Grid view' }).click();
		const grid = page.locator('ul[class*="WorkIndex-module__"][class*="__grid"]');
		await grid.waitFor();
		const gridHtml = await grid.evaluate((el) => el.outerHTML);
		await page.getByRole('button', { name: 'List view' }).click();
		await page.locator('[class*="ProjectList-module__"][class*="__wrap"]').waitFor();
		await page.evaluate((h) => {
			const list = document.querySelector('[class*="ProjectList-module__"][class*="__wrap"]');
			list.insertAdjacentHTML('afterend', h.replace('<ul ', '<ul hidden data-grid="" '));
		}, gridHtml);
	}
	const snap = await capture(key === 'work' ? null : path);
	snap.css.forEach((h) => css.add(h));
	snapshots[key] = snap;
	chrome ??= snap;
}
if (!snapshots.work.content.includes('data-grid')) throw new Error('could not merge grid view');
await browser.close();

// ---- assets -------------------------------------------------------------
const assets = new Map(); // public path -> key
const assetKey = (p) => {
	if (!assets.has(p)) assets.set(p, `a${assets.size}`);
	return assets.get(p);
};
const TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAIBAAA=';

function rewrite(html) {
	return (
		html
			// Next/Image → data-asset (filled from the asset table by runtime.js)
			.replace(/<img\b([^>]*?)\/?>/g, (tag, attrs) => {
				const src = attrs.match(/\ssrc="([^"]+)"/)?.[1] ?? '';
				let path = src;
				if (src.startsWith('/_next/image')) path = decodeURIComponent(src.match(/url=([^&]+)/)[1]);
				if (!path.startsWith('/media/')) return tag;
				const cleaned = attrs
					.replace(/\s(src|srcset|sizes|decoding|fetchpriority|data-nimg)="[^"]*"/g, '')
					.replace(/\sloading="lazy"/g, '');
				return `<img${cleaned} src="${TRANSPARENT}" data-asset="${assetKey(path)}">`;
			})
			.replace(/href="(\/[^"]*)"/g, (_, href) => `href="${toHash(href)}"`)
			.replace(/<link\b[^>]*>/g, '')
	);
}

for (const snap of Object.values(snapshots)) snap.content = rewrite(snap.content);
const top = rewrite(chrome.top);
const menu = rewrite(chrome.menu);
const video = {
	mp4: assetKey('/media/projects/soft-matter/loop.mp4'),
	webm: assetKey('/media/projects/soft-matter/loop.webm'),
};

const table = {};
for (const [path, key] of assets) {
	const file = join(root, 'public', path);
	if (path.endsWith('.svg'))
		table[key] = `data:image/svg+xml;base64,${readFileSync(file).toString('base64')}`;
	else if (path.endsWith('.mp4'))
		table[key] = `data:video/mp4;base64,${readFileSync(file).toString('base64')}`;
	else if (path.endsWith('.webm'))
		table[key] = `data:video/webm;base64,${readFileSync(file).toString('base64')}`;
	else {
		const buf = await sharp(file)
			.resize({ width: 1600, withoutEnlargement: true })
			.jpeg({ quality: 78, mozjpeg: true })
			.toBuffer();
		table[key] = `data:image/jpeg;base64,${buf.toString('base64')}`;
	}
}

// ---- css + fonts --------------------------------------------------------
let styles = '';
for (const href of css) styles += `${await (await fetch(href)).text()}\n`;
// Compiled CSS references fonts relative to /_next/static/chunks/ (e.g. url(../media/x.woff2)).
const fontUrls = [
	...new Set(
		[...styles.matchAll(/url\(((?:\.\.\/media|\/_next\/static\/media)\/[^)]+\.woff2)\)/g)].map((m) => m[1]),
	),
];
for (const u of fontUrls) {
	const abs = new URL(u, `${base}/_next/static/chunks/`).href;
	const buf = Buffer.from(await (await fetch(abs)).arrayBuffer());
	styles = styles.split(`url(${u})`).join(`url(data:font/woff2;base64,${buf.toString('base64')})`);
}
// Route changes in the preview use a root view transition with the site's curtain keyframes.
styles += `
::view-transition-old(root){animation:450ms var(--ease-in-out) both page-out}
::view-transition-new(root){animation:650ms var(--ease-in-out) both page-in}
@media (prefers-reduced-motion: reduce){::view-transition-old(root),::view-transition-new(root){animation:none}}
#view{display:contents}
`;

// ---- assemble -----------------------------------------------------------
const runtime = readFileSync(join(import.meta.dirname, 'runtime.js'), 'utf8');
const templates = Object.entries(snapshots)
	.map(
		([key, s]) =>
			`<template id="route-${key}" data-title="${s.title.replace(/"/g, '&quot;')}">${s.content}</template>`,
	)
	.join('\n');
const config = { htmlClass: chrome.htmlClass, video, routes: Object.keys(snapshots) };

const html = `<title>Graphic &amp; 3D Portfolio</title>
<style>${styles}</style>
<script>document.documentElement.className+=' ${chrome.htmlClass}';</script>
<a href="#main" class="skip-link">Skip to content</a>
<span id="scroll-sentinel" aria-hidden="true" style="position:absolute;top:40vh;height:1px;width:1px"></span>
${top}
<div id="view"></div>
${menu}
${templates}
<script type="application/json" id="preview-assets">${JSON.stringify(table)}</script>
<script type="application/json" id="preview-config">${JSON.stringify(config)}</script>
<script>${runtime}</script>
`;
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html);
console.log(
	`Wrote ${outFile} (${(html.length / 1024 / 1024).toFixed(2)} MB, ${Object.keys(snapshots).length} routes, ${assets.size} assets, ${fontUrls.length} fonts)`,
);
