#!/usr/bin/env node
/**
 * HISTORICAL: produced the committed sample artwork. Output file names predate
 * the CMS naming; after re-running, point content/ at the files and run
 * `pnpm media:normalize`. Not needed for normal use.
 *
 * Generates ORIGINAL placeholder artwork for the preview build.
 *
 * Every image is rendered from the HTML/CSS compositions below in headless
 * Chromium, then encoded with sharp (JPEG) and ffmpeg (MP4/WebM). Nothing is
 * downloaded or copied from third parties. Each frame carries a small
 * "Sample artwork" label so it can never be mistaken for real client work.
 *
 * Usage: node scripts/samples/generate-placeholders.mjs   (historical; the samples now live in content/ and are edited in the CMS)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '../..');
const out = join(root, 'public', 'media');
const fontUrl = `file://${join(root, 'src/fonts/hanken-grotesk-latin-wght.woff2')}`;

const SIZES = {
	cover: [2400, 1800],
	wide: [2400, 1350],
	portrait: [1600, 2000],
	square: [1800, 1800],
};

const base = (w, h, body, css = '') => `<!doctype html><html><head><style>
@font-face{font-family:H;src:url(${fontUrl}) format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:H,sans-serif;position:relative}
.label{position:absolute;right:${Math.round(w * 0.025)}px;bottom:${Math.round(h * 0.025)}px;
 font-size:${Math.round(Math.min(w, h) * 0.018)}px;letter-spacing:.08em;text-transform:uppercase;
 padding:.45em .9em;border-radius:99px;background:rgba(255,255,255,.72);color:#1C1D20;font-weight:500}
${css}</style></head><body>${body}<div class="label">Sample artwork</div></body></html>`;

/* ---------- composition helpers ---------- */
const sphere = (x, y, d, c1, c2, shadow = true) => `
 ${shadow ? `<div style="position:absolute;left:${x - d * 0.05}px;top:${y + d * 0.86}px;width:${d * 1.1}px;height:${d * 0.22}px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.28),rgba(0,0,0,0));filter:blur(${d * 0.04}px)"></div>` : ''}
 <div style="position:absolute;left:${x}px;top:${y}px;width:${d}px;height:${d}px;border-radius:50%;
  background:radial-gradient(circle at 32% 28%,${c1} 0%,${c2} 62%,rgba(0,0,0,.55) 100%)"></div>`;

const ring = (
	x,
	y,
	d,
	c,
) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${d}px;height:${d}px;border-radius:50%;
 background:conic-gradient(from 210deg,${c},#fff8,${c},#0006,${c});
 -webkit-mask:radial-gradient(circle,transparent 46%,#000 47%,#000 70%,transparent 71%)"></div>`;

const cylinder = (
	x,
	y,
	w,
	h,
	c,
) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;
 border-radius:${w / 2}px/${w * 0.18}px;background:linear-gradient(90deg,#0004,${c} 30%,#fff6 48%,${c} 66%,#0005)"></div>
 <div style="position:absolute;left:${x}px;top:${y - w * 0.02}px;width:${w}px;height:${w * 0.36}px;border-radius:50%;
 background:radial-gradient(circle at 45% 40%,#fff9,${c} 70%)"></div>`;

/* ---------- projects ---------- */
const projects = {
	'monolith-posters': {
		cover: ([w, h]) =>
			base(
				w,
				h,
				`
			<div style="position:absolute;inset:0;background:#E7E3DA"></div>
			${[0, 1, 2]
				.map(
					(i) => `
			<div style="position:absolute;top:${h * 0.12}px;left:${w * (0.09 + i * 0.29)}px;width:${w * 0.24}px;height:${h * 0.76}px;background:${['#1C1D20', '#F5F5F3', '#455CE9'][i]};box-shadow:0 30px 60px #0002">
			 <div style="position:absolute;left:12%;right:12%;top:10%;height:${['48%', '30%', '62%'][i]};background:${['#455CE9', '#1C1D20', '#F5F5F3'][i]};border-radius:${['0', '50% 50% 0 0', '0 0 50% 50%'][i]}"></div>
			 <div style="position:absolute;left:12%;bottom:8%;font-size:${w * 0.03}px;line-height:.9;font-weight:600;color:${['#F5F5F3', '#1C1D20', '#1C1D20'][i]}">${['MO', 'NO', 'LITH'][i]}<br><span style="font-size:.35em;font-weight:400">No. 0${i + 1}</span></div>
			</div>`,
				)
				.join('')}`,
			),
		gallery: [
			[
				'wide',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#1C1D20"></div>
			<div style="position:absolute;left:8%;top:12%;font-size:${h * 0.42}px;line-height:.82;font-weight:700;color:#F5F5F3;letter-spacing:-.04em">MONO<br><span style="color:#455CE9">LITH</span></div>
			<div style="position:absolute;right:8%;top:16%;width:${w * 0.22}px;height:${w * 0.22}px;border-radius:50%;background:#E7E3DA"></div>`,
					),
			],
			[
				'portrait',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#455CE9"></div>
			<div style="position:absolute;left:10%;right:10%;top:8%;bottom:30%;background:#F5F5F3;border-radius:${w}px ${w}px 0 0"></div>
			<div style="position:absolute;left:10%;bottom:8%;font-size:${w * 0.14}px;line-height:.9;font-weight:600;color:#F5F5F3">Poster<br>No. 02</div>`,
					),
			],
			[
				'square',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#E7E3DA"></div>
			${Array.from({ length: 6 }, (_, i) => `<div style="position:absolute;left:${10 + i * 13.5}%;top:${20 + (i % 2) * 8}%;width:10%;height:${45 + (i % 3) * 8}%;background:${i % 2 ? '#1C1D20' : '#455CE9'}"></div>`).join('')}`,
					),
			],
		],
	},
	'soft-matter': {
		cover: ([w, h]) =>
			base(
				w,
				h,
				`
			<div style="position:absolute;inset:0;background:linear-gradient(180deg,#D9D6E4,#B9B5CC)"></div>
			${sphere(w * 0.18, h * 0.3, h * 0.42, '#FFD9C7', '#E0603A')}
			${sphere(w * 0.46, h * 0.18, h * 0.55, '#E4E8FF', '#455CE9')}
			${sphere(w * 0.72, h * 0.42, h * 0.3, '#FFFFFF', '#9C99A8')}`,
			),
		gallery: [
			[
				'wide',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#1C1D20"></div>
			${sphere(w * 0.38, h * 0.16, h * 0.62, '#E4E8FF', '#455CE9', false)}
			<div style="position:absolute;left:0;right:0;bottom:0;height:22%;background:linear-gradient(#0000,#000a)"></div>`,
					),
			],
			[
				'square',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#EDE9E3"></div>
			${sphere(w * 0.12, h * 0.42, w * 0.3, '#FFFFFF', '#B5B1A8')}
			${sphere(w * 0.46, h * 0.3, w * 0.42, '#FFD9C7', '#E0603A')}`,
					),
			],
			[
				'portrait',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:linear-gradient(#C9C5D8,#8F8AA6)"></div>
			${sphere(w * 0.2, h * 0.08, w * 0.6, '#FFFFFF', '#9C99A8')}
			${sphere(w * 0.14, h * 0.42, w * 0.72, '#E4E8FF', '#455CE9')}`,
					),
			],
		],
		video: true,
	},
	'night-market-identity': {
		cover: ([w, h]) =>
			base(
				w,
				h,
				`
			<div style="position:absolute;inset:0;background:#141416"></div>
			<div style="position:absolute;left:12%;top:20%;width:${h * 0.6}px;height:${h * 0.6}px;border-radius:50%;background:#F2C14E"></div>
			<div style="position:absolute;left:calc(12% + ${h * 0.18}px);top:20%;width:${h * 0.6}px;height:${h * 0.6}px;border-radius:50%;background:#141416"></div>
			<div style="position:absolute;right:10%;top:30%;font-size:${h * 0.13}px;line-height:.95;font-weight:600;color:#F5F5F3;text-align:right">Night<br>Market</div>
			<div style="position:absolute;right:10%;bottom:16%;display:flex;gap:${w * 0.01}px">${['#F2C14E', '#E0603A', '#455CE9', '#F5F5F3'].map((c) => `<div style="width:${w * 0.05}px;height:${w * 0.05}px;border-radius:50%;background:${c}"></div>`).join('')}</div>`,
			),
		gallery: [
			[
				'wide',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,1fr)">${['#F2C14E', '#E0603A', '#455CE9', '#141416'].map((c, i) => `<div style="background:${c};position:relative"><span style="position:absolute;left:10%;bottom:10%;font-size:${h * 0.05}px;color:${i === 0 ? '#141416' : '#F5F5F3'}">${c}</span></div>`).join('')}</div>`,
					),
			],
			[
				'portrait',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#E0603A"></div>
			<div style="position:absolute;left:10%;top:8%;font-size:${w * 0.2}px;line-height:.85;font-weight:700;color:#141416">Open<br>after<br>dark</div>
			<div style="position:absolute;left:10%;bottom:10%;width:${w * 0.34}px;height:${w * 0.34}px;border-radius:50%;background:#F2C14E"></div>`,
					),
			],
			[
				'square',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#F5F5F3"></div>
			<div style="position:absolute;left:30%;top:22%;width:40%;height:40%;border-radius:50%;background:#141416"></div>
			<div style="position:absolute;left:42%;top:22%;width:40%;height:40%;border-radius:50%;background:#F5F5F3"></div>
			<div style="position:absolute;left:0;right:0;bottom:16%;text-align:center;font-size:${w * 0.05}px;font-weight:600;color:#141416;letter-spacing:.2em">NIGHT MARKET</div>`,
					),
			],
		],
	},
	'orbit-objects': {
		cover: ([w, h]) =>
			base(
				w,
				h,
				`
			<div style="position:absolute;inset:0;background:linear-gradient(180deg,#C7CBD1 0%,#A6ABB3 60%,#8E939B 100%)"></div>
			${ring(w * 0.14, h * 0.2, h * 0.6, '#455CE9')}
			${cylinder(w * 0.5, h * 0.3, w * 0.14, h * 0.48, '#E7E3DA')}
			${sphere(w * 0.72, h * 0.5, h * 0.26, '#FFFFFF', '#1C1D20')}`,
			),
		gallery: [
			[
				'wide',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#E9EAEB"></div>
			${ring(w * 0.36, h * 0.12, h * 0.76, '#1C1D20')}`,
					),
			],
			[
				'square',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#455CE9"></div>
			${cylinder(w * 0.36, h * 0.22, w * 0.28, h * 0.56, '#F5F5F3')}`,
					),
			],
			[
				'wide',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#1C1D20"></div>
			${[0, 1, 2, 3].map((i) => sphere(w * (0.12 + i * 0.2), h * 0.36, h * 0.3, '#FFFFFF', ['#455CE9', '#E0603A', '#9C99A8', '#F2C14E'][i])).join('')}`,
					),
			],
		],
	},
	'paper-architecture': {
		cover: ([w, h]) =>
			base(
				w,
				h,
				`
			<div style="position:absolute;inset:0;background:#F1EEE8"></div>
			${[0, 1, 2, 3, 4].map((i) => `<div style="position:absolute;left:${10 + i * 8}%;top:${14 + i * 6}%;width:${46}%;height:${60}%;background:${['#FFFFFF', '#E7E3DA', '#D8D2C6', '#C9C1B2', '#455CE9'][i]};border-radius:0 0 ${w * 0.2}px 0;box-shadow:12px 18px 40px #0002"></div>`).join('')}`,
			),
		gallery: [
			[
				'portrait',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#F1EEE8"></div>
			${[0, 1, 2, 3].map((i) => `<div style="position:absolute;left:${8 + i * 6}%;right:${8 + i * 6}%;top:${10 + i * 12}%;height:28%;background:${['#FFFFFF', '#E7E3DA', '#D8D2C6', '#455CE9'][i]};border-radius:${w}px ${w}px 0 0;box-shadow:0 18px 40px #0002"></div>`).join('')}`,
					),
			],
			[
				'wide',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#1C1D20"></div>
			${[0, 1, 2, 3, 4, 5].map((i) => `<div style="position:absolute;left:${6 + i * 15}%;bottom:12%;width:12%;height:${30 + i * 9}%;background:${i === 5 ? '#455CE9' : '#F1EEE8'};opacity:${0.4 + i * 0.12}"></div>`).join('')}`,
					),
			],
		],
	},
	'signal-type': {
		cover: ([w, h]) =>
			base(
				w,
				h,
				`
			<div style="position:absolute;inset:0;background:#455CE9"></div>
			${[0, 1, 2, 3, 4].map((i) => `<div style="position:absolute;left:-2%;top:${4 + i * 19}%;white-space:nowrap;font-size:${h * 0.2}px;line-height:1;font-weight:${300 + i * 120};color:${i === 2 ? '#1C1D20' : '#F5F5F3'};transform:translateX(${-i * 6}%)">Signal Signal Signal</div>`).join('')}`,
			),
		gallery: [
			[
				'square',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#F5F5F3"></div>
			<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:${w * 0.42}px;font-weight:700;color:#455CE9;letter-spacing:-.06em">Sg</div>`,
					),
			],
			[
				'wide',
				([w, h]) =>
					base(
						w,
						h,
						`
			<div style="position:absolute;inset:0;background:#1C1D20"></div>
			${Array.from({ length: 9 }, (_, i) => `<div style="position:absolute;left:${6 + i * 10}%;top:20%;font-size:${h * 0.5}px;font-weight:${100 + i * 100};color:${i === 4 ? '#455CE9' : '#F5F5F3'}">S</div>`).join('')}`,
					),
			],
		],
	},
};

/* ---------- video loop for soft-matter ---------- */
const videoHtml = (w, h) =>
	base(
		w,
		h,
		`
	<div style="position:absolute;inset:0;background:linear-gradient(180deg,#D9D6E4,#B9B5CC)"></div>
	<div class="orb a">${sphere(0, 0, h * 0.5, '#E4E8FF', '#455CE9')}</div>
	<div class="orb b">${sphere(0, 0, h * 0.3, '#FFD9C7', '#E0603A')}</div>`,
		`.orb{position:absolute;left:${w / 2 - h * 0.25}px;top:${h * 0.22}px;width:${h * 0.5}px;height:${h * 0.5}px}
	 .a{animation:bob 4s ease-in-out infinite}
	 .b{left:${w / 2 - h * 0.15}px;top:${h * 0.32}px;animation:orbit 4s linear infinite}
	 @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-${h * 0.05}px)}}
	 @keyframes orbit{0%{transform:translateX(${h * 0.55}px) scale(.9);z-index:0}25%{transform:translateX(0) scale(.7);z-index:0}50%{transform:translateX(-${h * 0.55}px) scale(.9);z-index:2}75%{transform:translateX(0) scale(1.1);z-index:2}100%{transform:translateX(${h * 0.55}px) scale(.9);z-index:0}}`,
	);

const portraitSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500" width="1200" height="1500">
  <!-- Neutral, featureless silhouette: a placeholder that does not depict anyone. -->
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E6164"/><stop offset="1" stop-color="#55585B"/></linearGradient></defs>
  <ellipse cx="600" cy="520" rx="215" ry="255" fill="url(#g)"/>
  <rect x="525" y="740" width="150" height="150" fill="url(#g)"/>
  <path d="M120 1500 C140 1080 330 900 600 880 C870 900 1060 1080 1080 1500 Z" fill="url(#g)"/>
</svg>`;

async function main() {
	mkdirSync(join(out, 'portrait'), { recursive: true });
	writeFileSync(join(out, 'portrait', 'placeholder.svg'), portraitSvg);

	const browser = await chromium.launch();
	const page = await browser.newPage();

	async function render(html, [w, h], file) {
		await page.setViewportSize({ width: w, height: h });
		await page.setContent(html, { waitUntil: 'load' });
		await page.evaluate(() => document.fonts.ready);
		const png = await page.screenshot({ type: 'png' });
		await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile(file);
		return png;
	}

	for (const [slug, def] of Object.entries(projects)) {
		const dir = join(out, 'projects', slug);
		mkdirSync(dir, { recursive: true });
		const coverPng = await render(def.cover(SIZES.cover), SIZES.cover, join(dir, 'cover.jpg'));
		// 1200x630 social image, centre crop of the cover.
		await sharp(coverPng)
			.resize(1200, 630, { fit: 'cover', position: 'centre' })
			.jpeg({ quality: 82 })
			.toFile(join(dir, 'social.jpg'));
		let n = 1;
		for (const [kind, tpl] of def.gallery) {
			await render(tpl(SIZES[kind]), SIZES[kind], join(dir, `gallery-${String(n++).padStart(2, '0')}.jpg`));
		}
		if (def.video) {
			const [vw, vh] = [1280, 720];
			const frames = mkdtempSync(join(tmpdir(), 'frames-'));
			await page.setViewportSize({ width: vw, height: vh });
			await page.setContent(videoHtml(vw, vh), { waitUntil: 'load' });
			const fps = 25;
			const total = 4 * fps;
			for (let f = 0; f < total; f++) {
				await page.evaluate(
					(t) =>
						document.getAnimations().forEach((a) => {
							a.pause();
							a.currentTime = t;
						}),
					(f / fps) * 1000,
				);
				await page.screenshot({ path: join(frames, `f${String(f).padStart(4, '0')}.png`) });
			}
			const input = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frames, 'f%04d.png')];
			execFileSync('ffmpeg', [
				...input,
				'-c:v',
				'libx264',
				'-pix_fmt',
				'yuv420p',
				'-crf',
				'26',
				'-preset',
				'slow',
				'-movflags',
				'+faststart',
				'-an',
				join(dir, 'loop.mp4'),
			]);
			execFileSync('ffmpeg', [
				...input,
				'-c:v',
				'libvpx-vp9',
				'-b:v',
				'0',
				'-crf',
				'38',
				'-row-mt',
				'1',
				'-an',
				join(dir, 'loop.webm'),
			]);
			await sharp(join(frames, 'f0000.png')).jpeg({ quality: 82 }).toFile(join(dir, 'loop-poster.jpg'));
			rmSync(frames, { recursive: true, force: true });
		}
		console.log(`✓ ${slug}`);
	}
	await browser.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
