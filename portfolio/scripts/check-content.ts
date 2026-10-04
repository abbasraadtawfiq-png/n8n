/**
 * Content and launch validation.
 *
 *   pnpm content:check     structural checks; safe for preview builds
 *   pnpm check:launch      also fails on anything that must not go public
 *                          (placeholders, samples, missing origin, contact setup)
 *
 * Also regenerates docs/asset-manifest.md from src/content/assets.ts.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import sharp from 'sharp';
import { assets } from '../src/content/assets';
import { projectInputs } from '../src/content/projects';
import type { Asset } from '../src/content/schema';
import { PLACEHOLDER_NAME, siteInput } from '../src/content/site';
import { validateContent } from '../src/content/validate';
import { parseSiteOrigin } from '../src/lib/config';

const launch = process.argv.includes('--launch');
const root = resolve(import.meta.dirname, '..');
const errors: string[] = [];
const warnings: string[] = [];

const { site, projects, issues } = validateContent(siteInput, projectInputs, assets as Record<string, Asset>);
issues.forEach((i) => errors.push(`${i.path}: ${i.message}`));

// --- asset files exist and dimensions match the manifest -------------------
function videoSize(file: string): [number, number] | null {
	try {
		const out = execFileSync(
			'ffprobe',
			[
				'-v',
				'error',
				'-select_streams',
				'v:0',
				'-show_entries',
				'stream=width,height',
				'-of',
				'csv=p=0',
				file,
			],
			{ encoding: 'utf8' },
		);
		const [w, h] = out.trim().split(',').map(Number);
		return w && h ? [w, h] : null;
	} catch {
		return null;
	}
}

const usage = new Map<string, string[]>();
const recordUse = (id: string, where: string) => usage.set(id, [...(usage.get(id) ?? []), where]);
if (site.portrait) recordUse(site.portrait, 'site.portrait (hero, about)');
recordUse('portrait-placeholder', 'hero/about fallback when site.portrait is null');
for (const p of projects) {
	recordUse(p.cover.asset, `${p.slug}: cover`);
	recordUse(p.socialImage, `${p.slug}: social image`);
	p.media.forEach((m, i) => recordUse(m.asset, `${p.slug}: media[${i}]`));
}
for (const [id, a] of Object.entries(assets as Record<string, Asset>))
	if (a.poster) recordUse(a.poster, `${id}: poster`);

for (const [id, asset] of Object.entries(assets as Record<string, Asset>)) {
	const files = [asset.src, ...(asset.alternates ?? []).map((a) => a.src)];
	for (const src of files) {
		const file = join(root, 'public', src);
		if (!existsSync(file)) {
			errors.push(`assets.${id}: missing file public${src}`);
			continue;
		}
		const kb = statSync(file).size / 1024;
		if (asset.type === 'image' && asset.mime !== 'image/svg+xml') {
			const meta = await sharp(file).metadata();
			if (meta.width !== asset.width || meta.height !== asset.height) {
				errors.push(
					`assets.${id}: manifest says ${asset.width}×${asset.height}, file is ${meta.width}×${meta.height}`,
				);
			}
			if (kb > 1500)
				warnings.push(`assets.${id}: ${Math.round(kb)} KB source image; consider exporting a smaller master`);
		}
		if (asset.type === 'video') {
			const size = videoSize(file);
			if (!size) warnings.push(`assets.${id}: could not read video size (ffprobe unavailable?)`);
			else if (size[0] !== asset.width || size[1] !== asset.height) {
				errors.push(
					`assets.${id}: manifest says ${asset.width}×${asset.height}, video is ${size[0]}×${size[1]}`,
				);
			}
			if (kb > 8000) warnings.push(`assets.${id}: ${Math.round(kb)} KB video; consider a lighter encode`);
		}
	}
	if (!usage.has(id)) warnings.push(`assets.${id}: declared but not used`);
}

// Files in public/media that the manifest does not know about.
const declared = new Set(
	Object.values(assets as Record<string, Asset>).flatMap((a) => [
		a.src,
		...(a.alternates ?? []).map((x) => x.src),
	]),
);
const walk = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
	);
for (const file of walk(join(root, 'public', 'media'))) {
	const src = `/${relative(join(root, 'public'), file)}`;
	if (!declared.has(src)) warnings.push(`public${src} is not in the asset manifest`);
}

// --- launch readiness -------------------------------------------------------
if (launch) {
	if (site.name === PLACEHOLDER_NAME) errors.push('site.name is still the placeholder');
	if (!site.portrait) errors.push('site.portrait is not set (placeholder silhouette would be shown)');
	if (site.bio.some((b) => /placeholder/i.test(b))) errors.push('site.bio still contains placeholder text');
	const samples = projects.filter((p) => p.publishStatus === 'sample');
	if (samples.length)
		errors.push(
			`${samples.length} sample project(s) still routable: ${samples.map((p) => p.slug).join(', ')}`,
		);
	if (!projects.some((p) => p.publishStatus === 'published')) errors.push('no published projects');
	const placeholders = Object.entries(assets as Record<string, Asset>).filter(
		([id, a]) => a.source === 'generated-placeholder' && usage.has(id) && id !== 'portrait-placeholder',
	);
	if (placeholders.length) errors.push(`${placeholders.length} placeholder asset(s) still in use`);

	const origin = parseSiteOrigin(process.env.SITE_URL);
	if (!origin) errors.push('SITE_URL is missing or not a valid https origin');
	else if (origin.isLocal) errors.push('SITE_URL points to a local host');
	if (process.env.SITE_INDEXING !== 'allow')
		errors.push('SITE_INDEXING is not "allow" (site would stay noindex)');

	const contactReady = Boolean(
		process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL,
	);
	if (!contactReady && !site.email)
		errors.push('No way to be contacted: configure the contact form provider or set site.email');
	if (!contactReady)
		warnings.push('Contact form provider not configured; the form will show its unconfigured state');
	if (contactReady && !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)) {
		warnings.push(
			'Rate limiting falls back to per-instance memory; configure Upstash for serverless/multi-instance hosting',
		);
	}
}

// --- asset manifest report --------------------------------------------------
const rows = Object.entries(assets as Record<string, Asset>).map(
	([id, a]) =>
		`| \`${id}\` | \`public${a.src}\` | ${a.type} | ${a.width}×${a.height} | ${a.alt || '_(decorative)_'} | ${a.source} | ${(usage.get(id) ?? ['—']).join('<br>')} |`,
);
writeFileSync(
	join(root, 'docs', 'asset-manifest.md'),
	`# Asset manifest\n\nGenerated by \`pnpm content:check\` from \`src/content/assets.ts\` — edit that file, not this one.\n\n| Id | File | Type | Size | Alt text | Source | Used in |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`,
);

warnings.forEach((w) => console.warn(`⚠ ${w}`));
errors.forEach((e) => console.error(`✗ ${e}`));
console.log(
	`${launch ? 'Launch' : 'Content'} check: ${projects.length} projects, ${Object.keys(assets).length} assets, ${errors.length} error(s), ${warnings.length} warning(s).`,
);
process.exit(errors.length ? 1 : 0);
