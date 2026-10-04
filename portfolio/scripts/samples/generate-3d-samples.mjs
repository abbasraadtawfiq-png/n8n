#!/usr/bin/env node
/**
 * HISTORICAL: produced the committed sample artwork. Output file names predate
 * the CMS naming; after re-running, point content/ at the files and run
 * `pnpm media:normalize`. Not needed for normal use.
 *
 * Generates the sample "Orbit Objects" extras: a wireframe/render image pair
 * for the before/after block and a small .glb model (built with three.js in
 * headless Chromium) for the 3D viewer block. All original, all labelled
 * "Sample artwork". Run: node scripts/samples/generate-3d-samples.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '../..');
const dir = join(root, 'public', 'media', 'projects', 'orbit-objects');
mkdirSync(dir, { recursive: true });
const font = `file://${join(root, 'src/fonts/hanken-grotesk-latin-wght.woff2')}`;
const [W, H] = [2400, 1350];

// Shared layout so the two frames line up exactly.
const L = {
	ring: { x: 0.17 * W, y: 0.19 * H, d: 0.62 * H },
	cyl: { x: 0.5 * W, y: 0.27 * H, w: 0.13 * W, h: 0.52 * H },
	sph: { x: 0.69 * W, y: 0.5 * H, d: 0.3 * H },
};

const label = `<div style="position:absolute;right:60px;bottom:34px;font:500 32px H,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:.45em .9em;border-radius:99px;background:rgba(255,255,255,.72);color:#1C1D20">Sample artwork</div>`;
const page = (body) =>
	`<!doctype html><html><head><style>@font-face{font-family:H;src:url(${font})}*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden;position:relative}</style></head><body>${body}${label}</body></html>`;

const wire = page(`
<div style="position:absolute;inset:0;background:#1C1D20;background-image:linear-gradient(#ffffff12 1px,transparent 1px),linear-gradient(90deg,#ffffff12 1px,transparent 1px);background-size:80px 80px"></div>
<svg width="${W}" height="${H}" style="position:absolute;inset:0" fill="none" stroke="#F5F5F3" stroke-width="3">
 ${(() => {
		const { x, y, d } = L.ring;
		const cx = x + d / 2,
			cy = y + d / 2,
			r = d / 2,
			ri = r * 0.66;
		let s = `<circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx}" cy="${cy}" r="${ri}"/>`;
		for (let a = 0; a < 360; a += 15) {
			const t = (a * Math.PI) / 180;
			s += `<line x1="${cx + ri * Math.cos(t)}" y1="${cy + ri * Math.sin(t)}" x2="${cx + r * Math.cos(t)}" y2="${cy + r * Math.sin(t)}" stroke-opacity=".55"/>`;
		}
		return s;
 })()}
 ${(() => {
		const { x, y, w, h } = L.cyl;
		const ry = w * 0.18;
		let s = `<ellipse cx="${x + w / 2}" cy="${y + ry}" rx="${w / 2}" ry="${ry}"/><ellipse cx="${x + w / 2}" cy="${y + h - ry}" rx="${w / 2}" ry="${ry}"/><line x1="${x}" y1="${y + ry}" x2="${x}" y2="${y + h - ry}"/><line x1="${x + w}" y1="${y + ry}" x2="${x + w}" y2="${y + h - ry}"/>`;
		for (let i = 1; i < 6; i++)
			s += `<path d="M${x} ${y + ry + ((h - 2 * ry) * i) / 6} A${w / 2} ${ry} 0 0 0 ${x + w} ${y + ry + ((h - 2 * ry) * i) / 6}" stroke-opacity=".55"/>`;
		for (let i = 1; i < 6; i++)
			s += `<line x1="${x + (w * i) / 6}" y1="${y + ry * 1.9}" x2="${x + (w * i) / 6}" y2="${y + h}" stroke-opacity=".35"/>`;
		return s;
 })()}
 ${(() => {
		const { x, y, d } = L.sph;
		const cx = x + d / 2,
			cy = y + d / 2,
			r = d / 2;
		let s = `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
		for (let i = 1; i < 6; i++)
			s += `<ellipse cx="${cx}" cy="${cy}" rx="${(r * i) / 6}" ry="${r}" stroke-opacity=".55"/>`;
		for (let i = 1; i < 6; i++) {
			const yy = cy - r + (2 * r * i) / 6;
			const half = Math.sqrt(r * r - (yy - cy) ** 2);
			s += `<ellipse cx="${cx}" cy="${yy}" rx="${half}" ry="${half * 0.18}" stroke-opacity=".55"/>`;
		}
		return s;
 })()}
</svg>`);

const sphere = (x, y, d, c1, c2) =>
	`<div style="position:absolute;left:${x - d * 0.05}px;top:${y + d * 0.86}px;width:${d * 1.1}px;height:${d * 0.22}px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.28),rgba(0,0,0,0));filter:blur(${d * 0.04}px)"></div><div style="position:absolute;left:${x}px;top:${y}px;width:${d}px;height:${d}px;border-radius:50%;background:radial-gradient(circle at 32% 28%,${c1} 0%,${c2} 62%,rgba(0,0,0,.55) 100%)"></div>`;
const render = page(`
<div style="position:absolute;inset:0;background:linear-gradient(180deg,#C7CBD1 0%,#A6ABB3 60%,#8E939B 100%)"></div>
<div style="position:absolute;left:${L.ring.x}px;top:${L.ring.y}px;width:${L.ring.d}px;height:${L.ring.d}px;border-radius:50%;background:conic-gradient(from 210deg,#455CE9,#fff8,#455CE9,#0006,#455CE9);-webkit-mask:radial-gradient(circle,transparent 46%,#000 47%,#000 70%,transparent 71%)"></div>
<div style="position:absolute;left:${L.cyl.x}px;top:${L.cyl.y}px;width:${L.cyl.w}px;height:${L.cyl.h}px;border-radius:${L.cyl.w / 2}px/${L.cyl.w * 0.18}px;background:linear-gradient(90deg,#0004,#E7E3DA 30%,#fff6 48%,#E7E3DA 66%,#0005)"></div>
<div style="position:absolute;left:${L.cyl.x}px;top:${L.cyl.y - L.cyl.w * 0.02}px;width:${L.cyl.w}px;height:${L.cyl.w * 0.36}px;border-radius:50%;background:radial-gradient(circle at 45% 40%,#fff9,#E7E3DA 70%)"></div>
${sphere(L.sph.x, L.sph.y, L.sph.d, '#FFFFFF', '#1C1D20')}`);

// three.js scene → GLB, exported in the browser (GLTFExporter needs browser APIs).
const threeDir = join(root, 'node_modules', 'three');
const modelHtml = `<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
const scene = new THREE.Scene();
const mat = (color, metalness, roughness) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.22, 24, 72), mat('#455CE9', 0.35, 0.3));
ring.position.set(-1.05, 0.62, 0); ring.rotation.set(0.25, 0.55, 0);
const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.2, 48), mat('#E7E3DA', 0.05, 0.45));
cyl.position.set(0.25, 0.6, 0);
const sph = new THREE.Mesh(new THREE.SphereGeometry(0.36, 48, 32), mat('#1C1D20', 0.6, 0.25));
sph.position.set(1.05, 0.36, 0.15);
const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.05, 64), mat('#C9CDD3', 0, 0.9));
base.position.set(0, -0.025, 0);
scene.add(ring, cyl, sph, base);
new GLTFExporter().parse(scene, (glb) => {
	const bytes = new Uint8Array(glb); let s = ''; for (const b of bytes) s += String.fromCharCode(b);
	window.__glb = btoa(s);
}, (e) => (window.__err = String(e)), { binary: true });
</script>`;

const browser = await chromium.launch();
const p = await browser.newPage();
for (const [name, html] of [
	['wireframe', wire],
	['render', render],
]) {
	await p.setViewportSize({ width: W, height: H });
	await p.setContent(html, { waitUntil: 'load' });
	await p.evaluate(() => document.fonts.ready);
	await sharp(await p.screenshot())
		.jpeg({ quality: 84, mozjpeg: true })
		.toFile(join(dir, `${name}.jpg`));
}
await p.route('http://gen.local/**', (route) => {
	const path = new URL(route.request().url()).pathname;
	if (path === '/') return route.fulfill({ contentType: 'text/html', body: modelHtml });
	if (path.startsWith('/three/'))
		return route.fulfill({
			contentType: 'text/javascript',
			body: readFileSync(join(threeDir, path.slice('/three/'.length))),
		});
	return route.fulfill({ status: 404 });
});
await p.goto('http://gen.local/');
await p.waitForFunction(() => window.__glb || window.__err, null, { timeout: 30000 });
const err = await p.evaluate(() => window.__err);
if (err) throw new Error(err);
writeFileSync(join(dir, 'model.glb'), Buffer.from(await p.evaluate(() => window.__glb), 'base64'));
// Poster for the 3D block: the render frame cropped to 16:10.
await sharp(join(dir, 'render.jpg'))
	.resize(1920, 1200, { fit: 'cover' })
	.jpeg({ quality: 82 })
	.toFile(join(dir, 'model-poster.jpg'));
await browser.close();
console.log('✓ orbit-objects extras (wireframe.jpg, render.jpg, model.glb, model-poster.jpg)');
