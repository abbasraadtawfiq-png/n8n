import { CATEGORY_LABELS, getAsset, type Project } from './index';

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
	const asset = getAsset(p.cover.asset);
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
			src: asset.src,
			width: asset.width,
			height: asset.height,
			alt: p.cover.alt ?? asset.alt,
			position: `${p.cover.focalPoint.x}% ${p.cover.focalPoint.y}%`,
		},
	};
}
