import type { Site } from './schema';

/**
 * Site identity. Replace the placeholder values before launch — see
 * docs/content-guide.md. Values left as `null` are hidden from the UI rather
 * than rendered as fake links.
 */

/** Sentinel used while the owner's real name is not supplied. */
export const PLACEHOLDER_NAME = 'Your Name';

export const siteInput: Site = {
	name: PLACEHOLDER_NAME,
	shortName: PLACEHOLDER_NAME,
	role: 'Graphic Designer & 3D Artist',
	roleLines: ['Graphic Designer', '& 3D Artist'],
	location: { city: 'Baghdad', country: 'Iraq', timeZone: 'Asia/Baghdad' },
	email: null,
	phone: null,
	availability: null,
	socialProfiles: [],
	portrait: null,
	// Draft positioning copy — confirm or rewrite (listed in docs/content-needed.md).
	statement: 'Graphic design and 3D imagery for brands, products and ideas that deserve to be seen clearly.',
	intro:
		'I move between flat graphic systems and rendered three-dimensional images, choosing whichever tells the idea best.',
	bio: [
		'Graphic designer and 3D artist based in Baghdad, Iraq.',
		'This paragraph is a placeholder for your story: how you started, what you care about in a brief, and the kind of work you want more of.',
	],
	services: [
		{
			title: 'Graphic Design',
			description:
				'Identities, posters, editorial layouts and the typographic systems that hold them together.',
		},
		{
			title: '3D Art',
			description:
				'Modelled, lit and rendered stills and short loops for products, campaigns and visual experiments.',
		},
		{
			title: 'Art Direction',
			description:
				'Shaping the look of a project from first references to final images, so every piece feels related.',
		},
	],
	edition: '2026',
	seo: {
		description:
			'Portfolio of a graphic designer and 3D artist based in Baghdad, Iraq — identities, posters and rendered 3D imagery.',
	},
};
