import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createReader } from '@keystatic/core/reader';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import config from '../../keystatic.config';
import { loadContent } from '@/content/load';

const root = resolve(import.meta.dirname, '../..');
const temps: string[] = [];
afterEach(() => temps.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

/** A throw-away copy of the real content + media to mutate in a test. */
function fixture(): string {
	const dir = mkdtempSync(join(tmpdir(), 'content-'));
	temps.push(dir);
	cpSync(join(root, 'content'), join(dir, 'content'), { recursive: true });
	cpSync(join(root, 'public', 'media'), join(dir, 'public', 'media'), { recursive: true });
	return dir;
}

const writeProject = (dir: string, slug: string, data: unknown) => {
	mkdirSync(join(dir, 'content', 'projects', slug), { recursive: true });
	writeFileSync(join(dir, 'content', 'projects', slug, 'index.yaml'), YAML.stringify(data));
};

describe('CMS content', () => {
	it('is valid for the site loader, with real image sizes and deterministic order', () => {
		const { errors, projects, site } = loadContent(root);
		expect(errors).toEqual([]);
		expect(site.location.timeZone).toBe('Asia/Baghdad');
		const soft = projects.find((p) => p.slug === 'soft-matter')!;
		expect(soft.cover).toMatchObject({ width: 2400, height: 1800 });
		expect(projects.map((p) => p.displayOrder)).toEqual(
			[...projects.map((p) => p.displayOrder)].sort((a, b) => a - b),
		);
	});

	it('is readable by Keystatic itself (what the admin UI will open)', async () => {
		const reader = createReader(root, config);
		const site = await reader.singletons.site.readOrThrow();
		expect(site.name.length).toBeGreaterThan(0);
		const entries = await reader.collections.projects.all();
		expect(entries.map((e) => e.slug).sort()).toEqual(
			loadContent(root)
				.projects.map((p) => p.slug)
				.sort(),
		);
		const orbit = entries.find((e) => e.slug === 'orbit-objects')!;
		expect(orbit.entry.media.map((m) => m.discriminant)).toContain('model');
	});

	it('reports missing files, bad slugs, bad links and unsafe published states', () => {
		const dir = fixture();
		const base = YAML.parse(readFileSync(join(root, 'content/projects/monolith-posters/index.yaml'), 'utf8'));
		writeProject(dir, 'Bad_Slug', base);
		writeProject(dir, 'missing-file', { ...base, cover: '/media/projects/nope.jpg' });
		writeProject(dir, 'bad-link', { ...base, externalUrl: 'http://insecure.example' });
		writeProject(dir, 'published-sample', {
			...base,
			publishStatus: 'published',
			seoTitle: 'Thing (sample)',
		});
		const messages = loadContent(dir)
			.errors.map((e) => `${e.path} ${e.message}`)
			.join('\n');
		expect(messages).toMatch(/Bad_Slug.*lowercase/);
		expect(messages).toMatch(/missing-file.*Missing file public\/media\/projects\/nope\.jpg/);
		expect(messages).toMatch(/bad-link.*https/);
		expect(messages).toMatch(/published-sample.*\(sample\)/);
		expect(messages).toMatch(/published-sample.*placeholder media/);
	});

	it('rejects non-https social profiles and unknown time zones', () => {
		const dir = fixture();
		const file = join(dir, 'content', 'site.yaml');
		const site = YAML.parse(readFileSync(file, 'utf8'));
		writeFileSync(
			file,
			YAML.stringify({
				...site,
				timeZone: 'Mars/Olympus',
				socialProfiles: [{ label: 'X', href: 'javascript:alert(1)' }],
			}),
		);
		const paths = loadContent(dir).errors.map((e) => e.path);
		expect(paths).toContain('site.timeZone');
		expect(paths).toContain('site.socialProfiles[0]');
	});
});
