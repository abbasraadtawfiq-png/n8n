import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { imageSize } from 'image-size';
import YAML from 'yaml';
import type { z } from 'zod';
import {
	rawProjectSchema,
	rawSiteSchema,
	type ImageAsset,
	type MediaBlock,
	type Project,
	type Site,
} from './schema';

/** Sentinel used while the owner's real name is not supplied. */
export const PLACEHOLDER_NAME = 'Your Name';

export interface ContentIssue {
	path: string;
	message: string;
}

export interface LoadedContent {
	site: Site;
	/** All projects including drafts, in display order. */
	projects: Project[];
	errors: ContentIssue[];
	warnings: ContentIssue[];
	/** Every media file referenced, for the generated manifest. */
	files: {
		src: string;
		usedIn: string;
		kind: 'image' | 'video' | 'model';
		width?: number;
		height?: number;
		source: string;
	}[];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIME: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };

function readYaml(file: string): unknown {
	return YAML.parse(readFileSync(file, 'utf8')) ?? {};
}

function zodIssues(where: string, error: z.ZodError): ContentIssue[] {
	return error.issues.map((i) => ({ path: `${where}.${i.path.join('.')}`, message: i.message }));
}

function isHttps(url: string) {
	try {
		return new URL(url).protocol === 'https:';
	} catch {
		return false;
	}
}

function isTimeZone(tz: string) {
	try {
		new Intl.DateTimeFormat('en', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

/**
 * Reads content/ (written by the CMS) synchronously, validates it and
 * resolves every media path against public/, reading real image sizes.
 * Pure apart from file reads, so it runs in next.config, scripts and tests.
 */
export function loadContent(root: string = process.cwd()): LoadedContent {
	const errors: ContentIssue[] = [];
	const warnings: ContentIssue[] = [];
	const files: LoadedContent['files'] = [];
	const publicDir = join(root, 'public');

	const resolveImage = (
		src: string,
		alt: string,
		where: string,
		usedIn: string,
		source: string,
	): ImageAsset => {
		const file = join(publicDir, src);
		if (!src.startsWith('/') || !existsSync(file)) {
			errors.push({ path: where, message: `Missing file public${src}` });
			return { src, width: 1, height: 1, alt };
		}
		try {
			const { width, height } = imageSize(readFileSync(file));
			if (!width || !height) throw new Error('no size');
			files.push({ src, usedIn, kind: 'image', width, height, source });
			if (statSync(file).size > 1.5 * 1024 * 1024) {
				warnings.push({ path: where, message: `public${src} is over 1.5 MB; export a lighter master` });
			}
			return { src, width, height, alt };
		} catch {
			errors.push({ path: where, message: `public${src} is not a readable image` });
			return { src, width: 1, height: 1, alt };
		}
	};

	const requireFile = (
		src: string,
		where: string,
		usedIn: string,
		kind: 'video' | 'model',
		source: string,
	) => {
		if (!src.startsWith('/') || !existsSync(join(publicDir, src))) {
			errors.push({ path: where, message: `Missing file public${src}` });
		} else {
			files.push({ src, usedIn, kind, source });
		}
	};

	// ---- site -----------------------------------------------------------------
	const siteFile = join(root, 'content', 'site.yaml');
	const siteRaw = rawSiteSchema.safeParse(existsSync(siteFile) ? readYaml(siteFile) : {});
	let site: Site;
	if (!siteRaw.success) {
		errors.push(...zodIssues('site', siteRaw.error));
		site = {
			name: PLACEHOLDER_NAME,
			shortName: PLACEHOLDER_NAME,
			role: '',
			roleLines: ['', ''],
			location: { city: '', country: '', timeZone: 'UTC' },
			email: null,
			phone: null,
			availability: null,
			socialProfiles: [],
			portrait: null,
			statement: '',
			intro: '',
			bio: [],
			services: [],
			edition: '',
			seo: { description: '' },
		};
	} else {
		const s = siteRaw.data;
		if (!isTimeZone(s.timeZone))
			errors.push({ path: 'site.timeZone', message: `Unknown time zone "${s.timeZone}"` });
		if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email))
			errors.push({ path: 'site.email', message: 'Not a valid email address' });
		s.socialProfiles.forEach((p, i) => {
			if (!isHttps(p.href))
				errors.push({ path: `site.socialProfiles[${i}]`, message: 'Profile links must be https URLs' });
		});
		site = {
			name: s.name,
			shortName: s.shortName,
			role: s.role,
			roleLines: [s.roleLine1, s.roleLine2],
			location: { city: s.city, country: s.country, timeZone: s.timeZone },
			email: s.email ?? null,
			phone: s.phone ?? null,
			availability: s.availability ?? null,
			socialProfiles: s.socialProfiles,
			portrait: s.portrait
				? resolveImage(s.portrait, '', 'site.portrait', 'site portrait', 'owner-supplied')
				: null,
			statement: s.statement,
			intro: s.intro,
			bio: s.bio,
			services: s.services,
			edition: s.edition ?? String(new Date().getFullYear()),
			seo: { description: s.seoDescription },
		};
	}

	// ---- projects ---------------------------------------------------------------
	const projectsDir = join(root, 'content', 'projects');
	const slugs = existsSync(projectsDir)
		? readdirSync(projectsDir, { withFileTypes: true })
				.filter((d) => d.isDirectory())
				.map((d) => d.name)
		: [];
	const projects: Project[] = [];

	for (const slug of slugs) {
		const where = `projects.${slug}`;
		const file = join(projectsDir, slug, 'index.yaml');
		if (!SLUG.test(slug))
			errors.push({
				path: where,
				message: 'Folder name (slug) must be lowercase letters, digits and single hyphens',
			});
		if (!existsSync(file)) {
			errors.push({ path: where, message: 'Missing index.yaml' });
			continue;
		}
		const parsed = rawProjectSchema.safeParse(readYaml(file));
		if (!parsed.success) {
			errors.push(...zodIssues(where, parsed.error));
			continue;
		}
		const p = parsed.data;
		const src = p.mediaSource;
		const img = (path: string, alt: string, field: string) =>
			resolveImage(path, alt, `${where}.${field}`, `${slug}: ${field}`, src);

		const media: MediaBlock[] = p.media.map((m, i): MediaBlock => {
			const f = `media[${i}]`;
			switch (m.discriminant) {
				case 'image':
					return {
						type: 'image',
						image: img(m.value.image, m.value.alt, `${f}.image`),
						caption: m.value.caption,
						layout: m.value.layout,
					};
				case 'video': {
					const sources = [m.value.mp4, m.value.webm].filter((v): v is string => Boolean(v));
					sources.forEach((s, j) =>
						requireFile(s, `${where}.${f}.video[${j}]`, `${slug}: ${f}`, 'video', src),
					);
					return {
						type: 'video',
						sources: sources.map((s) => ({
							src: s,
							mime: MIME[s.split('.').pop()!.toLowerCase()] ?? 'video/mp4',
						})),
						poster: img(m.value.poster, '', `${f}.poster`),
						label: m.value.alt,
						purpose: m.value.purpose,
						caption: m.value.caption,
						layout: m.value.layout,
					};
				}
				case 'compare': {
					const before = img(m.value.before, '', `${f}.before`);
					const after = img(m.value.after, '', `${f}.after`);
					if (Math.abs(before.width / before.height - after.width / after.height) > 0.01) {
						warnings.push({
							path: `${where}.${f}`,
							message: 'Before and after images have different aspect ratios',
						});
					}
					return {
						type: 'compare',
						before,
						after,
						beforeLabel: m.value.beforeLabel ?? 'Before',
						afterLabel: m.value.afterLabel ?? 'After',
						label: m.value.alt,
						caption: m.value.caption,
						layout: m.value.layout,
					};
				}
				case 'model':
					if (!/\.glb$/i.test(m.value.model))
						errors.push({ path: `${where}.${f}`, message: '3D models must be .glb files' });
					requireFile(m.value.model, `${where}.${f}.model`, `${slug}: ${f}`, 'model', src);
					return {
						type: 'model',
						src: m.value.model,
						poster: img(m.value.poster, '', `${f}.poster`),
						label: m.value.alt,
						caption: m.value.caption,
						layout: m.value.layout,
					};
			}
		});

		// Half-width blocks sit side by side in pairs; a lone one leaves an empty half row.
		for (let i = 0; i < media.length; i++) {
			if (media[i]!.layout !== 'half') continue;
			if (media[i + 1]?.layout === 'half') i++;
			else warnings.push({ path: `${where}.media[${i}]`, message: 'Half-width block has no half-width neighbour; make it full width or add a pair' });
		}
		if (p.roles.length === 0) errors.push({ path: `${where}.roles`, message: 'Add at least one role' });
		if (p.externalUrl && !isHttps(p.externalUrl))
			errors.push({ path: `${where}.externalUrl`, message: 'Must be an https URL' });
		if (p.publishStatus === 'published' && /\(sample\)/i.test(p.seoTitle)) {
			errors.push({ path: `${where}.seoTitle`, message: 'Published project still has a "(sample)" title' });
		}
		if (p.publishStatus === 'published' && JSON.stringify(p).includes('TODO')) {
			errors.push({ path: where, message: 'Published project still contains TODO text (alt text or copy)' });
		}
		if (p.publishStatus === 'published' && src === 'generated-placeholder') {
			errors.push({
				path: `${where}.mediaSource`,
				message: 'Published project still uses generated placeholder media',
			});
		}

		const cover = img(p.cover, p.coverAlt, 'cover');
		const social = p.socialImage ? img(p.socialImage, p.title, 'socialImage') : { ...cover, alt: p.title };
		if (p.socialImage && (social.width !== 1200 || social.height !== 630)) {
			warnings.push({
				path: `${where}.socialImage`,
				message: `Share images work best at 1200×630 (got ${social.width}×${social.height})`,
			});
		}

		projects.push({
			slug,
			title: p.title,
			shortDescription: p.shortDescription,
			category: p.category,
			client: p.client,
			year: p.year ?? undefined,
			location: p.location,
			roles: p.roles,
			credits: p.credits,
			tools: p.tools,
			featured: p.featured,
			displayOrder: p.displayOrder,
			publishStatus: p.publishStatus,
			accentColor: p.accentColor,
			cover: { ...cover, focalPoint: { x: p.focalX, y: p.focalY } },
			media,
			overview: p.overview,
			challenge: p.challenge,
			approach: p.approach,
			deliverables: p.deliverables,
			verifiedResults: p.verifiedResults,
			externalLink: p.externalUrl
				? { label: p.externalLabel ?? 'Live site', href: p.externalUrl }
				: undefined,
			seoTitle: p.seoTitle,
			seoDescription: p.seoDescription,
			socialImage: social,
			mediaSource: src,
			mediaPermission: p.mediaPermission,
		});
	}

	projects.sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title));
	return { site, projects, errors, warnings, files };
}
