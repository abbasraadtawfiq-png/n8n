import { z } from 'zod';

/** Lowercase, hyphen-separated slugs keep project URLs readable and stable. */
export const slugSchema = z
	.string()
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, digits and single hyphens');

const assetIdSchema = z.string().min(1);

export const assetSchema = z.object({
	/** Path under /public, starting with "/". */
	src: z.string().startsWith('/'),
	type: z.enum(['image', 'video']),
	mime: z.enum([
		'image/jpeg',
		'image/png',
		'image/webp',
		'image/avif',
		'image/svg+xml',
		'video/mp4',
		'video/webm',
	]),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	/** Default alt text. Leave empty only for purely decorative assets. */
	alt: z.string(),
	/** Alternative encodings of the same video, best first. */
	alternates: z.array(z.object({ src: z.string().startsWith('/'), mime: z.string() })).optional(),
	/** Image asset id shown before a video loads. */
	poster: assetIdSchema.optional(),
	source: z.enum(['generated-placeholder', 'owner-supplied', 'licensed']),
	/** Who owns it / under what terms it may be shown. */
	permission: z.string().min(1),
});

export const focalPointSchema = z.object({
	/** Percentages used for object-position in thumbnail crops. */
	x: z.number().min(0).max(100),
	y: z.number().min(0).max(100),
});

export const categorySchema = z.enum(['graphic-design', '3d', 'art-direction']);

const mediaItemSchema = z.object({
	type: z.enum(['image', 'video']),
	asset: assetIdSchema,
	/** Overrides the asset's default alt text for this placement. */
	alt: z.string().optional(),
	caption: z.string().optional(),
	/** "full" spans the content width; "half" pairs with a neighbouring half item. */
	layout: z.enum(['full', 'half']).default('full'),
	/** Meaningful videos get visible controls; decorative loops autoplay muted when visible. */
	purpose: z.enum(['decorative', 'meaningful']).optional(),
});

export const projectSchema = z
	.object({
		slug: slugSchema,
		title: z.string().min(1).max(80),
		shortDescription: z.string().min(1).max(200),
		category: categorySchema,
		client: z.string().optional(),
		year: z.number().int().min(1990).max(2100).optional(),
		location: z.string().optional(),
		roles: z.array(z.string()).min(1),
		credits: z.array(z.object({ role: z.string(), name: z.string() })).optional(),
		tools: z.array(z.string()).optional(),
		featured: z.boolean(),
		displayOrder: z.number().int(),
		/**
		 * published: real work, indexable when the site is launch-ready.
		 * sample:    preview placeholder, routable but always noindex and labelled.
		 * draft:     not routable at all.
		 */
		publishStatus: z.enum(['published', 'sample', 'draft']),
		/** Background behind the cover in hover previews and cards. */
		accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
		cover: z.object({ asset: assetIdSchema, alt: z.string().optional(), focalPoint: focalPointSchema }),
		media: z.array(mediaItemSchema),
		overview: z.string().min(1),
		challenge: z.string().optional(),
		approach: z.string().optional(),
		deliverables: z.array(z.string()).default([]),
		verifiedResults: z.array(z.string()).optional(),
		externalLink: z.object({ label: z.string(), href: z.url({ protocol: /^https$/ }) }).optional(),
		seoTitle: z.string().max(70),
		seoDescription: z.string().max(170),
		socialImage: assetIdSchema,
	})
	.strict();

export type Asset = z.infer<typeof assetSchema>;
export type ProjectInput = z.input<typeof projectSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Category = z.infer<typeof categorySchema>;
export type MediaItem = z.infer<typeof mediaItemSchema>;

export const socialProfileSchema = z.object({
	label: z.string().min(1),
	href: z.url({ protocol: /^https$/ }),
});

export const siteSchema = z
	.object({
		name: z.string().min(1),
		/** Short form used in the header wordmark, e.g. a first name. */
		shortName: z.string().min(1),
		role: z.string().min(1),
		roleLines: z.tuple([z.string(), z.string()]),
		location: z.object({ city: z.string(), country: z.string(), timeZone: z.string() }),
		email: z.email().nullable(),
		phone: z.string().nullable(),
		availability: z.string().nullable(),
		socialProfiles: z.array(socialProfileSchema),
		/** Asset id of a cut-out portrait on a transparent or hero-gray background, or null. */
		portrait: z.string().nullable(),
		statement: z.string(),
		intro: z.string(),
		bio: z.array(z.string()).min(1),
		services: z.array(z.object({ title: z.string(), description: z.string() })).min(1),
		/** Year shown as the "edition" in the footer. */
		edition: z.string(),
		seo: z.object({ description: z.string().max(170) }),
	})
	.strict();

export type Site = z.infer<typeof siteSchema>;
