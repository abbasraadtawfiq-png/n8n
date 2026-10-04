import { describe, expect, it } from 'vitest';
import { assets } from '@/content/assets';
import { projectInputs } from '@/content/projects';
import type { Asset, ProjectInput } from '@/content/schema';
import { siteInput } from '@/content/site';
import { validateContent } from '@/content/validate';

const allAssets = assets as Record<string, Asset>;

describe('content validation', () => {
	it('accepts the shipped content', () => {
		const { issues, projects } = validateContent(siteInput, projectInputs, allAssets);
		expect(issues).toEqual([]);
		// Deterministic ordering by displayOrder.
		expect(projects.map((p) => p.displayOrder)).toEqual(
			[...projects.map((p) => p.displayOrder)].sort((a, b) => a - b),
		);
	});

	it('flags duplicate slugs, bad slugs and unknown assets', () => {
		const base = projectInputs[0]!;
		const broken: ProjectInput[] = [
			base,
			{ ...base },
			{ ...base, slug: 'Bad Slug', displayOrder: 99 },
			{ ...base, slug: 'missing-asset', cover: { asset: 'nope', focalPoint: { x: 50, y: 50 } } },
		];
		const messages = validateContent(siteInput, broken, allAssets)
			.issues.map((i) => i.message)
			.join('\n');
		expect(messages).toMatch(/Duplicate slug/);
		expect(messages).toMatch(/Slug must be lowercase/);
		expect(messages).toMatch(/Unknown asset "nope"/);
	});

	it('requires 1200×630 social images and matching media types', () => {
		const base = projectInputs[1]!;
		const broken: ProjectInput[] = [
			{
				...base,
				socialImage: base.cover.asset,
				media: [{ type: 'image', asset: 'soft-matter/loop', layout: 'full' }],
			},
		];
		const messages = validateContent(siteInput, broken, allAssets)
			.issues.map((i) => i.message)
			.join('\n');
		expect(messages).toMatch(/Social image should be 1200×630/);
		expect(messages).toMatch(/is a video, expected image/);
	});

	it('rejects non-https external links and fake social profiles', () => {
		const base = projectInputs[0]!;
		const issues = validateContent(
			{ ...siteInput, socialProfiles: [{ label: 'X', href: 'javascript:alert(1)' }] },
			[{ ...base, externalLink: { label: 'Live', href: 'http://insecure.example' } }],
			allAssets,
		).issues;
		expect(issues.some((i) => i.path.startsWith('site.socialProfiles'))).toBe(true);
		expect(issues.some((i) => i.path.includes('externalLink'))).toBe(true);
	});
});
