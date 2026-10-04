/**
 * Moves media referenced by content/ to the file names the CMS (Keystatic)
 * itself uses, and updates the YAML to match:
 *
 *   cover              → /media/projects/<slug>/cover.<ext>
 *   socialImage        → /media/projects/<slug>/socialImage.<ext>
 *   media[i].<field>   → /media/projects/<slug>/media/<i>/value/<field>.<ext>
 *   site portrait      → /media/portrait/portrait.<ext>
 *
 * Without this, the first save in the CMS renames every file at once.
 * Idempotent; safe to run any time:  pnpm media:normalize
 */
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmdirSync,
	writeFileSync,
} from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import YAML from 'yaml';

const root = resolve(process.argv[2] ?? join(import.meta.dirname, '..'));
const pub = join(root, 'public');
let moved = 0;

function move(from: string, to: string): string {
	if (from === to) return to;
	const src = join(pub, from);
	const dst = join(pub, to);
	if (!existsSync(src)) {
		if (existsSync(dst)) return to; // already moved earlier
		throw new Error(`Referenced file is missing: public${from}`);
	}
	mkdirSync(dirname(dst), { recursive: true });
	renameSync(src, dst);
	moved++;
	return to;
}

function pruneEmptyDirs(dir: string) {
	if (!existsSync(dir)) return;
	for (const e of readdirSync(dir, { withFileTypes: true }))
		if (e.isDirectory()) pruneEmptyDirs(join(dir, e.name));
	if (readdirSync(dir).length === 0) rmdirSync(dir);
}

// ---- projects
const projectsDir = join(root, 'content', 'projects');
for (const slug of readdirSync(projectsDir)) {
	const file = join(projectsDir, slug, 'index.yaml');
	if (!existsSync(file)) continue;
	const doc = YAML.parseDocument(readFileSync(file, 'utf8'));
	const base = `/media/projects/${slug}`;
	const fix = (path: (string | number)[], prefix: string) => {
		const value = doc.getIn(path);
		if (typeof value !== 'string' || !value) return;
		doc.setIn(path, move(value, `${base}/${prefix}${extname(value).toLowerCase()}`));
	};
	fix(['cover'], 'cover');
	fix(['socialImage'], 'socialImage');
	const media = doc.getIn(['media']);
	const count = YAML.isSeq(media) ? media.items.length : 0;
	for (let i = 0; i < count; i++) {
		for (const field of ['image', 'mp4', 'webm', 'poster', 'before', 'after', 'model']) {
			fix(['media', i, 'value', field], `media/${i}/value/${field}`);
		}
	}
	writeFileSync(file, doc.toString({ lineWidth: 0 }));
}

// ---- site portrait
const siteFile = join(root, 'content', 'site.yaml');
const site = YAML.parseDocument(readFileSync(siteFile, 'utf8'));
const portrait = site.get('portrait');
if (typeof portrait === 'string' && portrait) {
	site.set('portrait', move(portrait, `/media/portrait/portrait${extname(portrait).toLowerCase()}`));
	writeFileSync(siteFile, site.toString({ lineWidth: 0 }));
}

pruneEmptyDirs(join(pub, 'media', 'projects'));
console.log(`Normalized media names (${moved} file(s) moved).`);
