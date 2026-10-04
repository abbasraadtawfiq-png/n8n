import { collection, config, fields, singleton } from '@keystatic/core';

/**
 * Content management (Keystatic). Content is stored as YAML in `content/` and
 * media in `public/media/`, so every edit is a normal file change in git.
 *
 * - Local mode (default): run `pnpm dev`, open http://localhost:3000/keystatic.
 * - GitHub mode (production): set NEXT_PUBLIC_KEYSTATIC_STORAGE=github and
 *   NEXT_PUBLIC_KEYSTATIC_REPO=owner/repo. Saving commits to the repo and the
 *   host redeploys. See docs/cms.md.
 */

const githubRepo = process.env.NEXT_PUBLIC_KEYSTATIC_REPO;
// Folder of this app inside the repo ("portfolio" here; empty if it is the repo root).
const pathPrefix = process.env.NEXT_PUBLIC_KEYSTATIC_PATH_PREFIX ?? 'portfolio';
const useGithub = process.env.NEXT_PUBLIC_KEYSTATIC_STORAGE === 'github' && githubRepo?.includes('/');

const image = (label: string, description?: string, isRequired = false) =>
	fields.image({
		label,
		description,
		directory: 'public/media/projects',
		publicPath: '/media/projects/',
		validation: { isRequired },
	});

const layout = fields.select({
	label: 'Width',
	description: 'Two consecutive "Half" items sit side by side on wide screens.',
	options: [
		{ label: 'Full width', value: 'full' },
		{ label: 'Half width', value: 'half' },
	],
	defaultValue: 'full',
});

const altText = (label = 'Alt text') =>
	fields.text({
		label,
		description: 'Describe what the image shows for people who cannot see it.',
		validation: { isRequired: true, length: { max: 300 } },
	});

const caption = fields.text({ label: 'Caption (optional)', validation: { length: { max: 300 } } });

const lines = (label: string, description?: string) =>
	fields.array(fields.text({ label: 'Item' }), { label, description, itemLabel: (p) => p.value || 'Item' });

export default config({
	storage: useGithub
		? { kind: 'github', repo: githubRepo as `${string}/${string}`, ...(pathPrefix ? { pathPrefix } : {}) }
		: { kind: 'local' },
	ui: {
		brand: { name: 'Portfolio CMS' },
		navigation: { Identity: ['site'], Work: ['projects'] },
	},
	singletons: {
		site: singleton({
			label: 'Site identity',
			path: 'content/site',
			format: { data: 'yaml' },
			schema: {
				name: fields.text({
					label: 'Full name',
					description: 'Shown in the hero, titles and footer. Placeholder until you change it.',
					validation: { isRequired: true, length: { max: 60 } },
				}),
				shortName: fields.text({
					label: 'Short name (header)',
					description: 'Used in “© Design by …”, e.g. your first name.',
					validation: { isRequired: true, length: { max: 30 } },
				}),
				role: fields.text({ label: 'Role', validation: { isRequired: true } }),
				roleLine1: fields.text({ label: 'Hero role — line 1', validation: { isRequired: true } }),
				roleLine2: fields.text({ label: 'Hero role — line 2', validation: { isRequired: true } }),
				city: fields.text({ label: 'City', validation: { isRequired: true } }),
				country: fields.text({ label: 'Country', validation: { isRequired: true } }),
				timeZone: fields.text({
					label: 'Time zone',
					description: 'IANA name used by the footer clock, e.g. Asia/Baghdad.',
					validation: { isRequired: true },
				}),
				email: fields.text({ label: 'Public email (optional)' }),
				phone: fields.text({ label: 'Phone (optional)' }),
				availability: fields.text({
					label: 'Availability (optional)',
					description: 'e.g. “Available for freelance from March”. Leave empty to hide.',
				}),
				socialProfiles: fields.array(
					fields.object({
						label: fields.text({ label: 'Label', validation: { isRequired: true } }),
						href: fields.url({ label: 'URL (https)', validation: { isRequired: true } }),
					}),
					{ label: 'Social profiles', itemLabel: (p) => p.fields.label.value || 'Profile' },
				),
				portrait: fields.image({
					label: 'Portrait',
					description:
						'Cut-out (transparent PNG/WebP) or on gray, at least 1600×2000, subject touching the bottom edge.',
					directory: 'public/media/portrait',
					publicPath: '/media/portrait/',
				}),
				statement: fields.text({
					label: 'Home statement',
					multiline: true,
					validation: { isRequired: true },
				}),
				intro: fields.text({ label: 'Home intro', multiline: true, validation: { isRequired: true } }),
				bio: fields.array(fields.text({ label: 'Paragraph', multiline: true }), {
					label: 'About — bio paragraphs',
					itemLabel: (p) => p.value.slice(0, 60) || 'Paragraph',
				}),
				services: fields.array(
					fields.object({
						title: fields.text({ label: 'Title', validation: { isRequired: true } }),
						description: fields.text({
							label: 'Description',
							multiline: true,
							validation: { isRequired: true },
						}),
					}),
					{ label: 'Services', itemLabel: (p) => p.fields.title.value || 'Service' },
				),
				edition: fields.text({
					label: 'Footer edition year',
					defaultValue: String(new Date().getFullYear()),
				}),
				seoDescription: fields.text({
					label: 'Default meta description',
					multiline: true,
					validation: { isRequired: true, length: { max: 170 } },
				}),
			},
		}),
	},
	collections: {
		projects: collection({
			label: 'Projects',
			path: 'content/projects/*/',
			slugField: 'title',
			format: { data: 'yaml' },
			columns: ['title', 'category', 'publishStatus', 'displayOrder'],
			previewUrl: '/work/{slug}',
			schema: {
				title: fields.slug({
					name: { label: 'Title', validation: { isRequired: true, length: { max: 80 } } },
					slug: { label: 'URL slug', description: 'Becomes /work/<slug>. Avoid changing it after launch.' },
				}),
				publishStatus: fields.select({
					label: 'Status',
					description:
						'Published = real work. Sample = placeholder (labelled, never indexed). Draft = hidden.',
					options: [
						{ label: 'Published', value: 'published' },
						{ label: 'Draft (hidden)', value: 'draft' },
						{ label: 'Sample (preview only)', value: 'sample' },
					],
					defaultValue: 'draft',
				}),
				category: fields.select({
					label: 'Category',
					options: [
						{ label: 'Graphic Design', value: 'graphic-design' },
						{ label: '3D', value: '3d' },
						{ label: 'Art Direction', value: 'art-direction' },
					],
					defaultValue: 'graphic-design',
				}),
				featured: fields.checkbox({ label: 'Show on the home page', defaultValue: false }),
				displayOrder: fields.integer({
					label: 'Display order',
					description: 'Lower numbers appear first.',
					defaultValue: 100,
					validation: { isRequired: true },
				}),
				shortDescription: fields.text({
					label: 'Short description',
					multiline: true,
					validation: { isRequired: true, length: { max: 200 } },
				}),
				roles: lines('Your role / services', 'What you actually did, e.g. “3D Modelling”.'),
				client: fields.text({ label: 'Client (only if approved for public use)' }),
				year: fields.integer({ label: 'Year', validation: { min: 1990, max: 2100 } }),
				location: fields.text({ label: 'Location (optional)' }),
				credits: fields.array(
					fields.object({
						role: fields.text({ label: 'Role', validation: { isRequired: true } }),
						name: fields.text({ label: 'Name', validation: { isRequired: true } }),
					}),
					{
						label: 'Credits / collaborators',
						itemLabel: (p) => `${p.fields.role.value}: ${p.fields.name.value}`,
					},
				),
				tools: lines('Tools (optional)'),
				accentColor: fields.text({
					label: 'Background colour behind the cover',
					description: 'Hex value, e.g. #E7E3DA. Used in previews and cards.',
					defaultValue: '#E9EAEB',
					validation: {
						isRequired: true,
						pattern: { regex: /^#[0-9a-fA-F]{6}$/, message: 'Use a hex colour like #E9EAEB' },
					},
				}),
				cover: image('Cover image', 'Any aspect ratio; about 2400px wide is plenty.', true),
				coverAlt: altText('Cover alt text'),
				focalX: fields.integer({
					label: 'Thumbnail focus — horizontal %',
					defaultValue: 50,
					validation: { isRequired: true, min: 0, max: 100 },
				}),
				focalY: fields.integer({
					label: 'Thumbnail focus — vertical %',
					defaultValue: 50,
					validation: { isRequired: true, min: 0, max: 100 },
				}),
				media: fields.array(
					fields.conditional(
						fields.select({
							label: 'Block type',
							options: [
								{ label: 'Image', value: 'image' },
								{ label: 'Video', value: 'video' },
								{ label: 'Before / after', value: 'compare' },
								{ label: '3D model (.glb)', value: 'model' },
							],
							defaultValue: 'image',
						}),
						{
							image: fields.object({
								image: image('Image', 'Shown uncropped at its original aspect ratio.', true),
								alt: altText(),
								caption,
								layout,
							}),
							video: fields.object({
								mp4: fields.file({
									label: 'Video (MP4, H.264)',
									directory: 'public/media/projects',
									publicPath: '/media/projects/',
									validation: { isRequired: true },
								}),
								webm: fields.file({
									label: 'Video (WebM, optional)',
									directory: 'public/media/projects',
									publicPath: '/media/projects/',
								}),
								poster: image(
									'Poster frame',
									'Shown before the video loads; also sets its aspect ratio.',
									true,
								),
								alt: altText('Description'),
								purpose: fields.select({
									label: 'Kind',
									options: [
										{ label: 'Silent loop (autoplays muted)', value: 'decorative' },
										{ label: 'Film with controls (no autoplay)', value: 'meaningful' },
									],
									defaultValue: 'decorative',
								}),
								caption,
								layout,
							}),
							compare: fields.object({
								before: image('Before (e.g. wireframe / clay)', 'Same size as the “after” image.', true),
								after: image('After (e.g. final render)', undefined, true),
								beforeLabel: fields.text({ label: 'Before label', defaultValue: 'Wireframe' }),
								afterLabel: fields.text({ label: 'After label', defaultValue: 'Final render' }),
								alt: altText('Description of both images'),
								caption,
								layout,
							}),
							model: fields.object({
								model: fields.file({
									label: '3D model (.glb)',
									directory: 'public/media/projects',
									publicPath: '/media/projects/',
									validation: { isRequired: true },
								}),
								poster: image('Poster image', 'Shown until the visitor chooses to load the model.', true),
								alt: altText('Description of the model'),
								caption,
								layout,
							}),
						},
					),
					{
						label: 'Gallery blocks',
						itemLabel: (p) => {
							const kind = p.discriminant;
							return `${kind[0]?.toUpperCase()}${kind.slice(1)}`;
						},
					},
				),
				overview: fields.text({ label: 'Overview', multiline: true, validation: { isRequired: true } }),
				challenge: fields.text({ label: 'Brief (optional)', multiline: true }),
				approach: fields.text({ label: 'Approach (optional)', multiline: true }),
				deliverables: lines('Deliverables'),
				verifiedResults: lines('Verified results (only real, checkable outcomes)'),
				externalLabel: fields.text({ label: 'External link label (optional)', defaultValue: 'Live site' }),
				externalUrl: fields.url({ label: 'External link URL (optional, https)' }),
				seoTitle: fields.text({ label: 'SEO title', validation: { isRequired: true, length: { max: 70 } } }),
				seoDescription: fields.text({
					label: 'SEO description',
					multiline: true,
					validation: { isRequired: true, length: { max: 170 } },
				}),
				socialImage: image('Social share image (optional, 1200×630)', 'If empty, the cover is used.'),
				mediaSource: fields.select({
					label: 'Media source',
					options: [
						{ label: 'My own work', value: 'owner-supplied' },
						{ label: 'Licensed', value: 'licensed' },
						{ label: 'Generated placeholder', value: 'generated-placeholder' },
					],
					defaultValue: 'owner-supplied',
				}),
				mediaPermission: fields.text({
					label: 'Permission note',
					description: 'e.g. “Client approved public use, 2026”.',
					multiline: true,
				}),
			},
		}),
	},
});
