#!/usr/bin/env node
/**
 * Lighthouse against a running PRODUCTION server (`pnpm build && pnpm start`).
 *
 *   BASE_URL=http://localhost:3000 pnpm audit:performance
 *
 * Runs 3 times per URL per form factor (mobile = Lighthouse default
 * simulated Moto G Power / slow 4G; desktop = Lighthouse desktop preset),
 * saves every JSON + HTML report, and writes the medians to summary.json.
 * Uses Playwright's Chromium unless CHROME_PATH is set.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const out = process.env.LH_OUT ?? 'docs/qa/lighthouse';
const runs = Number(process.env.LH_RUNS ?? 3);
const paths = (process.env.LH_PATHS ?? '/,/work/soft-matter').split(',');
const chromePath = process.env.CHROME_PATH ?? chromium.executablePath();
const lhVersion = JSON.parse(
	readFileSync(new URL('../node_modules/lighthouse/package.json', import.meta.url)),
).version;
let buildId = 'unknown';
try {
	buildId = readFileSync('.next/BUILD_ID', 'utf8').trim();
} catch {
	/* not built locally */
}

mkdirSync(out, { recursive: true });
const median = (xs) => {
	const s = [...xs].sort((a, b) => a - b);
	return s[Math.floor(s.length / 2)];
};

const summary = { date: new Date().toISOString(), base, lighthouse: lhVersion, buildId, runs, results: [] };
const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox'] });
try {
	for (const formFactor of ['mobile', 'desktop']) {
		for (const path of paths) {
			const samples = [];
			for (let i = 1; i <= runs; i++) {
				const result = await lighthouse(
					base + path,
					{ port: chrome.port, output: ['json', 'html'], logLevel: 'error' },
					formFactor === 'desktop' ? desktopConfig : undefined,
				);
				const lhr = result.lhr;
				if (lhr.runtimeError)
					throw new Error(`${path} (${formFactor}): ${lhr.runtimeError.code} ${lhr.runtimeError.message}`);
				const slug = `${formFactor}${path === '/' ? '_home' : path.replace(/\//g, '_')}-run${i}`;
				writeFileSync(join(out, `${slug}.json`), result.report[0]);
				writeFileSync(join(out, `${slug}.html`), result.report[1]);
				const a = lhr.audits;
				samples.push({
					performance: Math.round(lhr.categories.performance.score * 100),
					accessibility: Math.round(lhr.categories.accessibility.score * 100),
					bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
					seo: Math.round(lhr.categories.seo.score * 100),
					lcpMs: Math.round(a['largest-contentful-paint'].numericValue),
					tbtMs: Math.round(a['total-blocking-time'].numericValue),
					cls: Number(a['cumulative-layout-shift'].numericValue.toFixed(3)),
					fcpMs: Math.round(a['first-contentful-paint'].numericValue),
					transferKB: Math.round(a['total-byte-weight'].numericValue / 1024),
					scriptKB: Math.round(
						(a['resource-summary'].details?.items ?? []).find((x) => x.resourceType === 'script')
							?.transferSize / 1024 || 0,
					),
				});
				console.log(`${formFactor} ${path} run ${i}:`, samples.at(-1));
			}
			const keys = Object.keys(samples[0]);
			const med = Object.fromEntries(keys.map((k) => [k, median(samples.map((s) => s[k]))]));
			summary.results.push({ formFactor, path, median: med, samples });
		}
	}
} finally {
	await chrome.kill();
}
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('\nMedians:');
for (const r of summary.results)
	console.log(r.formFactor.padEnd(8), r.path.padEnd(20), JSON.stringify(r.median));
