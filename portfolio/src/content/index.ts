import { loadContent, PLACEHOLDER_NAME, type LoadedContent } from './load';
import type { Category, ImageAsset, MediaBlock, Project, Site } from './schema';

export type { Category, ImageAsset, MediaBlock, Project, Site };
export { PLACEHOLDER_NAME };

let cached: LoadedContent | null = null;

/**
 * Content from the CMS files. Cached for production builds; re-read on every
 * call in development so edits in /keystatic show up on refresh. Invalid
 * content throws with a readable list (fails the build, shows in dev).
 */
export function getContent(): LoadedContent {
	if (cached && process.env.NODE_ENV === 'production') return cached;
	const content = loadContent();
	if (content.errors.length > 0) {
		throw new Error(
			`Invalid portfolio content:\n${content.errors.map((i) => `  • ${i.path}: ${i.message}`).join('\n')}`,
		);
	}
	cached = content;
	return content;
}

export const CATEGORY_LABELS: Record<Category, string> = {
	'graphic-design': 'Graphic Design',
	'3d': '3D',
	'art-direction': 'Art Direction',
};

export const getSite = (): Site => getContent().site;

/** Projects with a detail page (published and preview samples), in display order. */
export const getProjects = (): Project[] => getContent().projects.filter((p) => p.publishStatus !== 'draft');

export const getFeaturedProjects = (): Project[] =>
	getProjects()
		.filter((p) => p.featured)
		.slice(0, 6);

export const getProject = (slug: string): Project | undefined => getProjects().find((p) => p.slug === slug);

/** Next project in display order, wrapping around; undefined when only one exists. */
export function getNextProject(slug: string): Project | undefined {
	const list = getProjects();
	const index = list.findIndex((p) => p.slug === slug);
	if (index === -1 || list.length < 2) return undefined;
	return list[(index + 1) % list.length];
}

/** Categories that actually contain projects, with counts, in a fixed order. */
export function getCategoryCounts(list: Project[] = getProjects()): { category: Category; count: number }[] {
	return (Object.keys(CATEGORY_LABELS) as Category[])
		.map((category) => ({ category, count: list.filter((p) => p.category === category).length }))
		.filter((c) => c.count > 0);
}

export const isSample = (p: Project) => p.publishStatus === 'sample';

/** Facts that decide whether the site may be indexed. */
export function getContentFlags() {
	const { site } = getContent();
	return {
		isPlaceholderIdentity: site.name === PLACEHOLDER_NAME,
		hasSampleProjects: getProjects().some(isSample),
	};
}

export const portraitPlaceholder: ImageAsset = {
	src: '/media/portrait/placeholder.svg',
	width: 1200,
	height: 1500,
	alt: '',
};

/** Factual meta rows for a project; fields that were not supplied are omitted, never invented. */
export function projectMeta(p: Project): { label: string; value: string }[] {
	const meta = [{ label: 'Role / Services', value: p.roles.join(', ') }];
	if (p.client) meta.push({ label: 'Client', value: p.client });
	if (p.credits.length)
		meta.push({ label: 'Credits', value: p.credits.map((c) => `${c.role}: ${c.name}`).join(', ') });
	const placeYear = [p.location, p.year?.toString()].filter(Boolean).join(' · ');
	if (placeYear) meta.push({ label: p.location ? 'Location & year' : 'Year', value: placeYear });
	return meta;
}
