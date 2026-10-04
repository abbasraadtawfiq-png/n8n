import type { MetadataRoute } from 'next';
import { projects } from '@/content';
import { absoluteUrl, siteIndexable } from '@/lib/seo';

/**
 * Canonical, indexable pages only. While the site is a preview (no origin,
 * indexing not allowed, placeholder identity or sample projects) the sitemap
 * is intentionally empty. Sample and draft projects are never listed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
	if (!siteIndexable) return [];
	const pages = ['/', '/work', '/about', '/contact'].map((path) => ({ url: absoluteUrl(path)! }));
	const work = projects
		.filter((p) => p.publishStatus === 'published')
		.map((p) => ({ url: absoluteUrl(`/work/${p.slug}`)! }));
	return [...pages, ...work];
}
