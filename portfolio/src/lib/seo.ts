import type { Metadata } from 'next';
import { hasSampleProjects, isPlaceholderIdentity, site, type Project } from '@/content';
import { indexingRequested, siteOrigin } from './config';

/** Whole-site indexability: real origin + explicit opt-in + no placeholder identity or samples. */
export const siteIndexable = indexingRequested && !isPlaceholderIdentity && !hasSampleProjects;

export const isPreview = !siteIndexable;

export function absoluteUrl(path: string): string | undefined {
	return siteOrigin ? new URL(path, siteOrigin.origin).toString() : undefined;
}

interface PageMetaInput {
	title?: string;
	description: string;
	path: string;
	/** Absolute-path image under /public (1200×630). */
	image?: { src: string; width: number; height: number; alt: string };
	noindex?: boolean;
	type?: 'website' | 'article' | 'profile';
}

const brandTitle = `${site.name} — ${site.role}`;

export function pageMetadata({
	title,
	description,
	path,
	image,
	noindex,
	type = 'website',
}: PageMetaInput): Metadata {
	const indexable = siteIndexable && !noindex;
	const canonical = absoluteUrl(path);
	const fullTitle = title ? `${title} — ${site.name}` : brandTitle;
	// Without a validated origin, absolute URLs cannot be formed honestly, so
	// canonical and Open Graph image URLs are omitted rather than faked.
	const ogImage =
		image && siteOrigin
			? [{ url: absoluteUrl(image.src)!, width: image.width, height: image.height, alt: image.alt }]
			: undefined;

	return {
		title: { absolute: fullTitle },
		description,
		alternates: canonical ? { canonical } : undefined,
		robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
		openGraph: {
			title: fullTitle,
			description,
			type,
			url: canonical,
			siteName: site.name,
			locale: 'en_US',
			images: ogImage,
		},
		twitter: { card: ogImage ? 'summary_large_image' : 'summary', title: fullTitle, description },
	};
}

export const defaultOgImage = { src: '/og-default.png', width: 1200, height: 630, alt: brandTitle };

/** Serialise JSON-LD safely for embedding in a <script> element. */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}

/** Person + ProfilePage, only with confirmed identity on an indexable site. */
export function personJsonLd(): object | null {
	if (!siteIndexable || !siteOrigin) return null;
	const sameAs = site.socialProfiles.map((s) => s.href);
	return {
		'@context': 'https://schema.org',
		'@type': 'ProfilePage',
		url: absoluteUrl('/about'),
		mainEntity: {
			'@type': 'Person',
			name: site.name,
			jobTitle: site.role,
			url: siteOrigin.origin,
			address: {
				'@type': 'PostalAddress',
				addressLocality: site.location.city,
				addressCountry: site.location.country,
			},
			...(sameAs.length ? { sameAs } : {}),
		},
	};
}

/** CreativeWork + BreadcrumbList for a published project; null for samples. */
export function projectJsonLd(project: Project, imageSrc: string): object[] | null {
	if (!siteIndexable || project.publishStatus !== 'published') return null;
	const url = absoluteUrl(`/work/${project.slug}`);
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'CreativeWork',
			name: project.title,
			description: project.shortDescription,
			url,
			image: absoluteUrl(imageSrc),
			creator: { '@type': 'Person', name: site.name },
			...(project.year ? { dateCreated: String(project.year) } : {}),
			genre: project.category,
		},
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Work', item: absoluteUrl('/work') },
				{ '@type': 'ListItem', position: 2, name: project.title, item: url },
			],
		},
	];
}
