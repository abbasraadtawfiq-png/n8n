import { z } from 'zod';

/*
 * Two layers:
 *  - Raw schemas: the YAML the CMS (keystatic.config.ts) writes to content/.
 *    Lenient about empty strings / missing optional keys, strict about shape.
 *  - Normalized types: what components consume, with resolved media
 *    (real pixel sizes read from the files) and no empty-string placeholders.
 */

/** Optional text: missing, null or whitespace becomes undefined. */
const optText = z
	.string()
	.nullish()
	.transform((v) => (v && v.trim() ? v.trim() : undefined));
const text = z.string().trim().min(1);
const lines = z
	.array(z.string().nullish())
	.nullish()
	.transform((v) => (v ?? []).map((s) => (s ?? '').trim()).filter(Boolean));
const layout = z.enum(['full', 'half']).default('full');

export const categorySchema = z.enum(['graphic-design', '3d', 'art-direction']);
export type Category = z.infer<typeof categorySchema>;

export const rawSiteSchema = z.object({
	name: text,
	shortName: text,
	role: text,
	roleLine1: text,
	roleLine2: text,
	city: text,
	country: text,
	timeZone: text,
	email: optText,
	phone: optText,
	availability: optText,
	socialProfiles: z
		.array(z.object({ label: text, href: z.string().trim() }))
		.nullish()
		.transform((v) => v ?? []),
	portrait: optText,
	statement: text,
	intro: text,
	bio: lines,
	services: z.array(z.object({ title: text, description: text })).min(1),
	edition: optText,
	seoDescription: z.string().trim().min(1).max(170),
});

const rawMediaSchema = z.discriminatedUnion('discriminant', [
	z.object({
		discriminant: z.literal('image'),
		value: z.object({ image: text, alt: text, caption: optText, layout }),
	}),
	z.object({
		discriminant: z.literal('video'),
		value: z.object({
			mp4: text,
			webm: optText,
			poster: text,
			alt: text,
			purpose: z.enum(['decorative', 'meaningful']).default('decorative'),
			caption: optText,
			layout,
		}),
	}),
	z.object({
		discriminant: z.literal('compare'),
		value: z.object({
			before: text,
			after: text,
			beforeLabel: optText,
			afterLabel: optText,
			alt: text,
			caption: optText,
			layout,
		}),
	}),
	z.object({
		discriminant: z.literal('model'),
		value: z.object({ model: text, poster: text, alt: text, caption: optText, layout }),
	}),
]);

export const rawProjectSchema = z.object({
	title: z.string().trim().min(1).max(80),
	publishStatus: z.enum(['published', 'sample', 'draft']),
	category: categorySchema,
	featured: z.boolean().default(false),
	displayOrder: z.number().int(),
	shortDescription: z.string().trim().min(1).max(200),
	roles: lines,
	client: optText,
	year: z.number().int().min(1990).max(2100).nullish(),
	location: optText,
	credits: z
		.array(z.object({ role: text, name: text }))
		.nullish()
		.transform((v) => v ?? []),
	tools: lines,
	accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	cover: text,
	coverAlt: text,
	focalX: z.number().min(0).max(100).default(50),
	focalY: z.number().min(0).max(100).default(50),
	media: z
		.array(rawMediaSchema)
		.nullish()
		.transform((v) => v ?? []),
	overview: text,
	challenge: optText,
	approach: optText,
	deliverables: lines,
	verifiedResults: lines,
	externalLabel: optText,
	externalUrl: optText,
	seoTitle: z.string().trim().min(1).max(70),
	seoDescription: z.string().trim().min(1).max(170),
	socialImage: optText,
	mediaSource: z.enum(['owner-supplied', 'licensed', 'generated-placeholder']).default('owner-supplied'),
	mediaPermission: optText,
});

export type RawProject = z.infer<typeof rawProjectSchema>;

// ---- normalized ------------------------------------------------------------

export interface ImageAsset {
	src: string;
	width: number;
	height: number;
	alt: string;
}

type Layout = 'full' | 'half';

export type MediaBlock =
	| { type: 'image'; image: ImageAsset; caption?: string; layout: Layout }
	| {
			type: 'video';
			sources: { src: string; mime: string }[];
			poster: ImageAsset;
			label: string;
			purpose: 'decorative' | 'meaningful';
			caption?: string;
			layout: Layout;
	  }
	| {
			type: 'compare';
			before: ImageAsset;
			after: ImageAsset;
			beforeLabel: string;
			afterLabel: string;
			label: string;
			caption?: string;
			layout: Layout;
	  }
	| { type: 'model'; src: string; poster: ImageAsset; label: string; caption?: string; layout: Layout };

export interface Project {
	slug: string;
	title: string;
	shortDescription: string;
	category: Category;
	client?: string;
	year?: number;
	location?: string;
	roles: string[];
	credits: { role: string; name: string }[];
	tools: string[];
	featured: boolean;
	displayOrder: number;
	publishStatus: 'published' | 'sample' | 'draft';
	accentColor: string;
	cover: ImageAsset & { focalPoint: { x: number; y: number } };
	media: MediaBlock[];
	overview: string;
	challenge?: string;
	approach?: string;
	deliverables: string[];
	verifiedResults: string[];
	externalLink?: { label: string; href: string };
	seoTitle: string;
	seoDescription: string;
	socialImage: ImageAsset;
	mediaSource: RawProject['mediaSource'];
	mediaPermission?: string;
}

export interface Site {
	name: string;
	shortName: string;
	role: string;
	roleLines: [string, string];
	location: { city: string; country: string; timeZone: string };
	email: string | null;
	phone: string | null;
	availability: string | null;
	socialProfiles: { label: string; href: string }[];
	portrait: ImageAsset | null;
	statement: string;
	intro: string;
	bio: string[];
	services: { title: string; description: string }[];
	edition: string;
	seo: { description: string };
}
