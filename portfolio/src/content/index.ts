import { assets, getAsset } from './assets';
import { projectInputs } from './projects';
import type { Asset, Category, Project } from './schema';
import { PLACEHOLDER_NAME, siteInput } from './site';
import { validateContent } from './validate';

const validated = validateContent(siteInput, projectInputs, assets);
if (validated.issues.length > 0) {
	// Fail the build loudly instead of rendering broken pages.
	throw new Error(
		`Invalid portfolio content:\n${validated.issues.map((i) => `  • ${i.path}: ${i.message}`).join('\n')}`,
	);
}

export const site = validated.site;
export { getAsset };
export type { Asset, Category, Project };

export const CATEGORY_LABELS: Record<Category, string> = {
	'graphic-design': 'Graphic Design',
	'3d': '3D',
	'art-direction': 'Art Direction',
};

/** Projects with a detail page (published and preview samples), in display order. */
export const projects: Project[] = validated.projects.filter((p) => p.publishStatus !== 'draft');

export const featuredProjects = projects.filter((p) => p.featured).slice(0, 6);

export function getProject(slug: string): Project | undefined {
	return projects.find((p) => p.slug === slug);
}

/** Next project in display order, wrapping around; undefined when only one exists. */
export function getNextProject(slug: string): Project | undefined {
	const index = projects.findIndex((p) => p.slug === slug);
	if (index === -1 || projects.length < 2) return undefined;
	return projects[(index + 1) % projects.length];
}

/** Categories that actually contain projects, with counts, in a fixed order. */
export function getCategoryCounts(list: Project[] = projects): { category: Category; count: number }[] {
	return (Object.keys(CATEGORY_LABELS) as Category[])
		.map((category) => ({ category, count: list.filter((p) => p.category === category).length }))
		.filter((c) => c.count > 0);
}

export const isSample = (p: Project) => p.publishStatus === 'sample';
export const hasSampleProjects = projects.some(isSample);
export const isPlaceholderIdentity = site.name === PLACEHOLDER_NAME;
export const portrait: Asset | null = site.portrait ? getAsset(site.portrait) : null;
export const portraitPlaceholder: Asset = getAsset('portrait-placeholder');

/** Factual meta rows for a project; fields that were not supplied are omitted, never invented. */
export function projectMeta(p: Project): { label: string; value: string }[] {
	const meta = [{ label: 'Role / Services', value: p.roles.join(', ') }];
	if (p.client) meta.push({ label: 'Client', value: p.client });
	if (p.credits?.length)
		meta.push({ label: 'Credits', value: p.credits.map((c) => `${c.role}: ${c.name}`).join(', ') });
	const placeYear = [p.location, p.year?.toString()].filter(Boolean).join(' · ');
	if (placeYear) meta.push({ label: p.location ? 'Location & year' : 'Year', value: placeYear });
	return meta;
}
