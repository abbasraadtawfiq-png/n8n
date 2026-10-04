#!/usr/bin/env node
/**
 * Builds a single-file, interactive PREVIEW of the portfolio for hosts that
 * cannot run Next.js (e.g. a shared Claude artifact). It snapshots the
 * rendered HTML of every route from a running production server, inlines the
 * compiled CSS, fonts, images, video and 3D models as data URIs, rewrites
 * internal links to in-page routes (#work, #p-<slug>, …) and adds
 * runtime.js, which reproduces the site's interactions. The contact form
 * cannot send and the CMS is not included.
 *
 *   pnpm build && pnpm start --port 3100 &
 *   BASE_URL=http://localhost:3100 node scripts/preview-artifact/build.mjs out/preview.html
 *
 * This is a preview mirror only; the deployable site is the Next.js app.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import YAML from 'yaml';

const root = resolve(import.meta.dirname, '../..');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const outFile = resolve(process.argv[2] ?? join(root, 'out', 'preview.html'));

const projectsDir = join(root, 'content', 'projects');
const slugs = readdirSync(projectsDir).filter((slug) => {
	const file = join(projectsDir, slug, 'index.yaml');
	return existsSync(file) && YAML.parse(readFileSync(file, 'utf8')).publishStatus !== 'draft';
});
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
	const path = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
	if (path === '/') return '#home';
	const m = path.match(/^\/work\/([a-z0-9-]+)$/);
	if (m) return `#p-${m[1]}`;
	if (['/work', '/about', '/contact', '/privacy'].includes(path)) return `#${path.slice(1)}`;
	return '#notfound';
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => sessionStorage.setItem('preloaded', '1'));
const page = await context.newPage();
const css = new Set();
const snapshots = {};
let chrome = null;

/** Scroll through the page so lazy parts (e.g. video elements) render. */
async function settle() {
	await page.evaluate(async () => {
		for (let y = 0; y < document.body.scrollHeight; y += 500) {
			window.scrollTo(0, y);
			await new Promise((r) => setTimeout(r, 50));
		}
		window.scrollTo(0, 0);
	});
	await page.waitForTimeout(500);
}

async function capture(path) {
	if (path) {
		await page.goto(base + path, { waitUntil: 'networkidle' });
		await settle();
	}
	return page.evaluate(() => {
		// Drop runtime-only state so the preview runtime starts clean.
		document.querySelectorAll('[style*="translate"]').forEach((el) => {
			for (const p of ['transform', 'translate', 'rotate', 'scale']) el.style.removeProperty(p);
			if (!el.getAttribute('style')) el.removeAttribute('style');
		});
		document.querySelectorAll('[data-revealed]').forEach((el) => el.removeAttribute('data-revealed'));
		document.querySelectorAll('[data-ready]').forEach((el) => el.removeAttribute('data-ready'));
		document.querySelectorAll('video').forEach((v) => {
			v.pause();
			v.removeAttribute('autoplay');
		});
		const kids = [...document.body.children];
		const top = kids.find((el) => el.querySelector('header'));
		const menu = kids.find((el) => el.querySelector('button[aria-controls]'));
		const curtain = kids.find((el) => el.hasAttribute('data-phase'));
		const preloader = kids.find((el) => [...el.classList].some((c) => c.startsWith('Preloader-module__')));
		const content = kids.filter(
			(el) =>
				![top, menu, curtain, preloader].includes(el) &&
				!['SCRIPT', 'TEMPLATE', 'NEXT-ROUTE-ANNOUNCER', 'LINK', 'STYLE'].includes(el.tagName) &&
				!el.classList.contains('skip-link') &&
				el.id !== 'scroll-sentinel',
		);
		return {
			title: document.title,
			htmlClass: document.documentElement.className.replace(/\bjs\b/, '').trim(),
			top: top?.outerHTML ?? '',
			menu: menu?.outerHTML ?? '',
			curtain: curtain?.outerHTML ?? '',
			preloader: preloader?.outerHTML ?? '',
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
	if (key === 'home') chrome = snap;
}
if (!snapshots.work.content.includes('data-grid')) throw new Error('could not merge grid view');
await browser.close();

// ---- assets ---------------------------------------------------------------
const assets = new Map(); // public path -> key
const assetKey = (p) => {
	if (!assets.has(p)) assets.set(p, `a${assets.size}`);
	return assets.get(p);
};
const TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAIBAAA=';
const mediaPath = (src) => (src.startsWith('/_next/image') ? decodeURIComponent(src.match(/url=([^&]+)/)[1]) : src);

function rewrite(html) {
	return (
		html
			// Next/Image → data-asset (filled from the asset table by runtime.js)
			.replace(/<img\b([^>]*?)\/?>/g, (tag, attrs) => {
				const path = mediaPath(attrs.match(/\ssrc="([^"]+)"/)?.[1] ?? '');
				if (!path.startsWith('/media/')) return tag;
				const cleaned = attrs
					.replace(/\s(src|srcset|sizes|decoding|fetchpriority|data-nimg)="[^"]*"/g, '')
					.replace(/\sloading="(lazy|eager)"/g, '');
				return `<img${cleaned} src="${TRANSPARENT}" data-asset="${assetKey(path)}">`;
			})
			.replace(/<source\b([^>]*?)\ssrc="(\/media\/[^"]+)"/g, (_, a, src) => `<source${a} data-asset="${assetKey(src)}"`)
			.replace(/<video\b([^>]*?)\sposter="(\/[^"]+)"/g, (_, a, src) => `<video${a} data-poster-asset="${assetKey(mediaPath(src))}"`)
			.replace(/data-model-src="(\/media\/[^"]+)"/g, (_, src) => `data-model-asset="${assetKey(src)}"`)
			// Full-size image links used by the lightbox.
			.replace(/href="(\/media\/[^"]+)"/g, (_, src) => `href="#" data-full-asset="${assetKey(src)}"`)
			.replace(/href="(\/[^"]*)"/g, (_, href) => `href="${toHash(href)}"`)
			.replace(/<link\b[^>]*>/g, '')
	);
}

for (const snap of Object.values(snapshots)) snap.content = rewrite(snap.content);
const top = rewrite(chrome.top);
const menu = rewrite(chrome.menu);

const table = {};
const mime = { svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', glb: 'model/gltf-binary' };
for (const [path, key] of assets) {
	const file = join(root, 'public', path);
	const ext = path.split('.').pop().toLowerCase();
	if (mime[ext]) table[key] = `data:${mime[ext]};base64,${readFileSync(file).toString('base64')}`;
	else {
		const buf = await sharp(file).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
		table[key] = `data:image/jpeg;base64,${buf.toString('base64')}`;
	}
}

// ---- css + fonts ----------------------------------------------------------
let styles = '';
for (const href of css) styles += `${await (await fetch(href)).text()}\n`;
// Compiled CSS references fonts relative to /_next/static/chunks/ (e.g. url(../media/x.woff2)).
const fontUrls = [...new Set([...styles.matchAll(/url\(((?:\.\.\/media|\/_next\/static\/media)\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
for (const u of fontUrls) {
	const abs = new URL(u, `${base}/_next/static/chunks/`).href;
	const buf = Buffer.from(await (await fetch(abs)).arrayBuffer());
	styles = styles.split(`url(${u})`).join(`url(data:font/woff2;base64,${buf.toString('base64')})`);
}
styles += '\n#view{display:contents}\n[hidden]{display:none!important}\n';

// ---- assemble -------------------------------------------------------------
const runtime = readFileSync(join(import.meta.dirname, 'runtime.js'), 'utf8');
const templates = Object.entries(snapshots)
	.map(([key, s]) => `<template id="route-${key}" data-title="${s.title.replace(/"/g, '&quot;')}">${s.content}</template>`)
	.join('\n');
const labels = Object.fromEntries(
	Object.entries(snapshots).map(([key, s]) => [key, key.startsWith('p-') ? s.title.split(' (sample)')[0].split(' — ')[0] : { home: 'Home', work: 'Work', about: 'About', contact: 'Contact', privacy: 'Privacy', notfound: '' }[key]]),
);
const config = { routes: Object.keys(snapshots), labels };

const html = `<title>Graphic &amp; 3D Portfolio</title>
<style>${styles}</style>
<script>document.documentElement.className+=' js ${chrome.htmlClass}';try{if(!sessionStorage.getItem('preloaded')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.preload='run'}catch(e){}</script>
<a href="#main" class="skip-link">Skip to content</a>
<span id="scroll-sentinel" aria-hidden="true" style="position:absolute;top:40vh;height:1px;width:1px"></span>
${top}
<div id="view"></div>
${menu}
${chrome.preloader}
${chrome.curtain}
${templates}
<script type="application/json" id="preview-assets">${JSON.stringify(table)}</script>
<script type="application/json" id="preview-config">${JSON.stringify(config)}</script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js" defer></script>
<script>${runtime}</script>
`;
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html);
console.log(`Wrote ${outFile} (${(html.length / 1024 / 1024).toFixed(2)} MB, ${Object.keys(snapshots).length} routes, ${assets.size} assets, ${fontUrls.length} fonts)`);
