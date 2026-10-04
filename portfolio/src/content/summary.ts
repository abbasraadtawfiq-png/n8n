import { CATEGORY_LABELS, type Project } from './index';

/** Serializable subset of a project for client components. */
export interface ProjectSummary {
	slug: string;
	title: string;
	category: Project['category'];
	categoryLabel: string;
	roles: string;
	year: number | null;
	sample: boolean;
	accentColor: string;
	cover: { src: string; width: number; height: number; alt: string; position: string };
}

export function toSummary(p: Project): ProjectSummary {
	return {
		slug: p.slug,
		title: p.title,
		category: p.category,
		categoryLabel: CATEGORY_LABELS[p.category],
		roles: p.roles.join(' & '),
		year: p.year ?? null,
		sample: p.publishStatus === 'sample',
		accentColor: p.accentColor,
		cover: {
			src: p.cover.src,
			width: p.cover.width,
			height: p.cover.height,
			alt: p.cover.alt,
			position: `${p.cover.focalPoint.x}% ${p.cover.focalPoint.y}%`,
		},
	};
}
