import type { ProjectInput } from './schema';

/**
 * Portfolio projects. Order on the site follows `displayOrder` (then title).
 *
 * Every entry below is a SAMPLE: placeholder artwork generated for the
 * preview, with copy that only describes that artwork. They are labelled on
 * the site, excluded from the sitemap and structured data, and served with
 * `noindex`. Replace them with real projects (publishStatus: 'published')
 * following docs/content-guide.md.
 */
export const projectInputs: ProjectInput[] = [
	{
		slug: 'monolith-posters',
		title: 'Monolith Posters',
		shortDescription:
			'A sample series of three typographic posters built from tall blocks and simple arches.',
		category: 'graphic-design',
		roles: ['Graphic Design', 'Typography'],
		featured: true,
		displayOrder: 10,
		publishStatus: 'sample',
		accentColor: '#E7E3DA',
		cover: { asset: 'monolith-posters/cover', focalPoint: { x: 50, y: 50 } },
		media: [
			{ type: 'image', asset: 'monolith-posters/g1', layout: 'full' },
			{ type: 'image', asset: 'monolith-posters/g2', layout: 'half' },
			{ type: 'image', asset: 'monolith-posters/g3', layout: 'half' },
		],
		overview:
			'Placeholder entry showing how a poster series is presented. The artwork is a generated set of three posters that pair one geometric shape with heavy lettering.',
		challenge:
			'Sample brief: give a set of posters a clear family resemblance while letting each one stand alone.',
		approach:
			'Sample approach: one shared grid, one shape per poster, and a strict palette of charcoal, white and blue.',
		deliverables: ['Poster series (sample)', 'Typographic lockups (sample)'],
		seoTitle: 'Monolith Posters (sample)',
		seoDescription: 'Sample poster series used to preview the portfolio layout.',
		socialImage: 'monolith-posters/social',
	},
	{
		slug: 'soft-matter',
		title: 'Soft Matter',
		shortDescription: 'A sample set of soft-lit sphere studies, including a short silent loop.',
		category: '3d',
		roles: ['3D Modelling', 'Lighting', 'Rendering'],
		featured: true,
		displayOrder: 20,
		publishStatus: 'sample',
		accentColor: '#CFCBDD',
		cover: { asset: 'soft-matter/cover', focalPoint: { x: 50, y: 55 } },
		media: [
			{
				type: 'video',
				asset: 'soft-matter/loop',
				layout: 'full',
				purpose: 'decorative',
				caption: 'Sample loop, 4 seconds, no sound.',
			},
			{ type: 'image', asset: 'soft-matter/g1', layout: 'full' },
			{ type: 'image', asset: 'soft-matter/g2', layout: 'half' },
			{ type: 'image', asset: 'soft-matter/g3', layout: 'half' },
		],
		overview:
			'Placeholder entry showing how 3D stills and motion are presented. The images are generated sphere studies with soft shadows and a single short loop.',
		challenge: 'Sample brief: make simple forms feel tactile using light and colour alone.',
		approach: 'Sample approach: a limited palette, one key light and shallow contact shadows.',
		deliverables: ['Still renders (sample)', 'Looping animation (sample)'],
		seoTitle: 'Soft Matter (sample)',
		seoDescription: 'Sample 3D sphere studies used to preview the portfolio layout.',
		socialImage: 'soft-matter/social',
	},
	{
		slug: 'night-market-identity',
		title: 'Night Market',
		shortDescription: 'A sample visual identity: crescent mark, warm palette and evening poster.',
		category: 'art-direction',
		roles: ['Art Direction', 'Visual Identity'],
		featured: true,
		displayOrder: 30,
		publishStatus: 'sample',
		accentColor: '#2A2A2E',
		cover: { asset: 'night-market-identity/cover', focalPoint: { x: 40, y: 50 } },
		media: [
			{ type: 'image', asset: 'night-market-identity/g1', layout: 'full' },
			{ type: 'image', asset: 'night-market-identity/g2', layout: 'half' },
			{ type: 'image', asset: 'night-market-identity/g3', layout: 'half' },
		],
		overview:
			'Placeholder entry showing how an identity project is presented: a mark, a palette and an application. The brand is fictional and the artwork is generated.',
		approach:
			'Sample approach: a crescent built from two circles, a palette of four colours and bold condensed headlines.',
		deliverables: ['Logo mark (sample)', 'Colour palette (sample)', 'Poster (sample)'],
		seoTitle: 'Night Market identity (sample)',
		seoDescription: 'Sample visual identity used to preview the portfolio layout.',
		socialImage: 'night-market-identity/social',
	},
	{
		slug: 'orbit-objects',
		title: 'Orbit Objects',
		shortDescription: 'A sample still life of primitive 3D forms: ring, cylinder and sphere.',
		category: '3d',
		roles: ['3D Art', 'Composition'],
		featured: true,
		displayOrder: 40,
		publishStatus: 'sample',
		accentColor: '#B7BBC2',
		cover: { asset: 'orbit-objects/cover', focalPoint: { x: 45, y: 50 } },
		media: [
			{ type: 'image', asset: 'orbit-objects/g1', layout: 'full' },
			{ type: 'image', asset: 'orbit-objects/g2', layout: 'half' },
			{ type: 'image', asset: 'orbit-objects/g3', layout: 'full' },
		],
		overview: 'Placeholder entry for a 3D still-life study. All images are generated sample artwork.',
		deliverables: ['Still renders (sample)'],
		seoTitle: 'Orbit Objects (sample)',
		seoDescription: 'Sample 3D still life used to preview the portfolio layout.',
		socialImage: 'orbit-objects/social',
	},
	{
		slug: 'paper-architecture',
		title: 'Paper Architecture',
		shortDescription: 'A sample study of layered paper shapes and shadow.',
		category: 'graphic-design',
		roles: ['Graphic Design', 'Illustration'],
		featured: false,
		displayOrder: 50,
		publishStatus: 'sample',
		accentColor: '#E9E5DD',
		cover: { asset: 'paper-architecture/cover', focalPoint: { x: 50, y: 50 } },
		media: [
			{ type: 'image', asset: 'paper-architecture/g1', layout: 'half' },
			{ type: 'image', asset: 'paper-architecture/g2', layout: 'full' },
		],
		overview: 'Placeholder entry built from generated layered-paper compositions.',
		deliverables: ['Illustrations (sample)'],
		seoTitle: 'Paper Architecture (sample)',
		seoDescription: 'Sample layered paper illustrations used to preview the portfolio layout.',
		socialImage: 'paper-architecture/social',
	},
	{
		slug: 'signal-type',
		title: 'Signal',
		shortDescription: 'A sample typographic exploration of one word across many weights.',
		category: 'art-direction',
		roles: ['Art Direction', 'Typography'],
		featured: false,
		displayOrder: 60,
		publishStatus: 'sample',
		accentColor: '#455CE9',
		cover: { asset: 'signal-type/cover', focalPoint: { x: 30, y: 50 } },
		media: [
			{ type: 'image', asset: 'signal-type/g1', layout: 'half' },
			{ type: 'image', asset: 'signal-type/g2', layout: 'full' },
		],
		overview:
			'Placeholder entry showing a type-led project. The artwork repeats one word in a range of weights.',
		deliverables: ['Typographic studies (sample)'],
		seoTitle: 'Signal (sample)',
		seoDescription: 'Sample typographic study used to preview the portfolio layout.',
		socialImage: 'signal-type/social',
	},
];
