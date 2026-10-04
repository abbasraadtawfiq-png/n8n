/**
 * Import a folder of artwork as a new DRAFT project:
 *
 *   pnpm project:add <folder> --title "Project name" [--category graphic-design|3d|art-direction]
 *                     [--slug custom-slug] [--keep-audio]
 *
 * Folder contents (sorted by file name, so prefix with 01-, 02-… to order them):
 *   - a file named cover.* is the cover; otherwise the first image is used
 *   - images (jpg/png/webp/avif/tiff) → gallery image blocks, max 2400px wide
 *   - videos (mp4/mov/webm/…)          → video blocks (MP4 + WebM + poster), needs ffmpeg
 *   - 3D models (.glb)                 → 3D blocks; poster = an image with the same name, else the cover
 *   - before.* + after.*               → one before/after block
 *
 * Files land where the CMS expects them and the project is created as a
 * draft with "TODO" text, so it never goes live unfinished. Finish it in
 * the CMS (/keystatic), then set its status to Published.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import YAML from 'yaml';
import { loadContent } from '../src/content/load';
import { IMAGE_EXT, makeSocialImage, MODEL_EXT, processImage, transcodeVideo, VIDEO_EXT } from './lib/media';

const root = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const flag = (name: string) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : undefined;
};
const folder = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
const title = flag('title');
const category = flag('category') ?? 'graphic-design';

if (!folder || !existsSync(folder) || !title) {
	console.error(
		'Usage: pnpm project:add <folder> --title "Project name" [--category graphic-design|3d|art-direction] [--slug slug]',
	);
	process.exit(1);
}
if (!['graphic-design', '3d', 'art-direction'].includes(category)) {
	console.error('--category must be graphic-design, 3d or art-direction');
	process.exit(1);
}

const slug =
	flag('slug') ??
	title
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
	console.error(`Could not derive a URL slug from "${title}". Pass --slug my-project.`);
	process.exit(1);
}
const projectDir = join(root, 'content', 'projects', slug);
if (existsSync(projectDir)) {
	console.error(`content/projects/${slug} already exists. Choose another --slug.`);
	process.exit(1);
}

const pub = join(root, 'public');
const mediaBase = join(pub, 'media', 'projects', slug);
const toPublic = (abs: string) => `/${relative(pub, abs).split('\\').join('/')}`;
const files = readdirSync(folder)
	.filter((f) => !f.startsWith('.'))
	.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
	.map((f) => join(resolve(folder), f));
const stem = (f: string) => basename(f, extname(f)).toLowerCase();

const images = files.filter((f) => IMAGE_EXT.test(f));
const coverSrc = images.find((f) => stem(f) === 'cover') ?? images[0];
if (!coverSrc) {
	console.error('The folder needs at least one image (used as the cover).');
	process.exit(1);
}
const before = images.find((f) => stem(f) === 'before');
const after = images.find((f) => stem(f) === 'after');
const models = files.filter((f) => MODEL_EXT.test(f));
const modelPosters = new Set(models.map((m) => images.find((i) => stem(i) === stem(m))).filter(Boolean));
const galleryImages = images.filter(
	(f) => f !== coverSrc && f !== before && f !== after && !modelPosters.has(f),
);
const videos = files.filter((f) => VIDEO_EXT.test(f));

const TODO_ALT = 'TODO: describe what this shows';
const media: unknown[] = [];
const blockPath = (i: number, field: string) => join(mediaBase, 'media', String(i), 'value', field);

const cover = await processImage(coverSrc, join(mediaBase, 'cover'));
await makeSocialImage(cover, join(mediaBase, 'socialImage.jpg'));
console.log(`✓ cover ← ${basename(coverSrc)}`);

if (before && after) {
	const i = media.length;
	const b = await processImage(before, blockPath(i, 'before'));
	const a = await processImage(after, blockPath(i, 'after'));
	media.push({
		discriminant: 'compare',
		value: {
			before: toPublic(b),
			after: toPublic(a),
			beforeLabel: 'Wireframe',
			afterLabel: 'Final render',
			alt: TODO_ALT,
			layout: 'full',
		},
	});
	console.log('✓ before/after block');
}
for (const img of galleryImages) {
	const i = media.length;
	const out = await processImage(img, blockPath(i, 'image'));
	media.push({ discriminant: 'image', value: { image: toPublic(out), alt: TODO_ALT, layout: 'full' } });
	console.log(`✓ image ← ${basename(img)}`);
}
for (const video of videos) {
	const i = media.length;
	console.log(`… converting ${basename(video)} (this can take a while)`);
	const v = transcodeVideo(
		video,
		{
			mp4: `${blockPath(i, 'mp4')}.mp4`,
			webm: `${blockPath(i, 'webm')}.webm`,
			poster: `${blockPath(i, 'poster')}.jpg`,
		},
		{ keepAudio: argv.includes('--keep-audio') },
	);
	media.push({
		discriminant: 'video',
		value: {
			mp4: toPublic(v.mp4),
			webm: toPublic(v.webm),
			poster: toPublic(v.poster),
			alt: TODO_ALT,
			purpose: argv.includes('--keep-audio') ? 'meaningful' : 'decorative',
			layout: 'full',
		},
	});
	console.log(`✓ video ← ${basename(video)}`);
}
for (const model of models) {
	const i = media.length;
	const dest = `${blockPath(i, 'model')}.glb`;
	mkdirSync(join(dest, '..'), { recursive: true });
	copyFileSync(model, dest);
	const posterSrc = images.find((img) => stem(img) === stem(model)) ?? coverSrc;
	const poster = await processImage(posterSrc, blockPath(i, 'poster'));
	media.push({
		discriminant: 'model',
		value: { model: toPublic(dest), poster: toPublic(poster), alt: TODO_ALT, layout: 'full' },
	});
	console.log(`✓ 3D model ← ${basename(model)}`);
}

const existing = loadContent(root).projects;
const displayOrder = (existing.reduce((m, p) => Math.max(m, p.displayOrder), 0) || 0) + 10;
const doc = {
	title,
	publishStatus: 'draft',
	category,
	featured: false,
	displayOrder,
	shortDescription: 'TODO: one or two sentences about the project.',
	roles: ['TODO: your role'],
	client: '',
	location: '',
	credits: [],
	tools: [],
	accentColor: '#E9EAEB',
	cover: toPublic(cover),
	coverAlt: TODO_ALT,
	focalX: 50,
	focalY: 50,
	media,
	overview: 'TODO: what the project is and what you did.',
	challenge: '',
	approach: '',
	deliverables: [],
	verifiedResults: [],
	externalLabel: 'Live site',
	seoTitle: title.slice(0, 70),
	seoDescription: 'TODO: a short description for search results and link previews.',
	socialImage: `/media/projects/${slug}/socialImage.jpg`,
	mediaSource: 'owner-supplied',
	mediaPermission: '',
};
mkdirSync(projectDir, { recursive: true });
writeFileSync(join(projectDir, 'index.yaml'), YAML.stringify(doc, { lineWidth: 0 }));

console.log(
	`\nCreated draft project "${title}" → content/projects/${slug}/index.yaml (${media.length} gallery block(s)).`,
);
console.log(
	'Next: run `pnpm dev`, open http://localhost:3000/keystatic → Projects, replace every TODO, then set Status to Published.',
);
