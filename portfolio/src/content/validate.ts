import {
	assetSchema,
	projectSchema,
	siteSchema,
	type Asset,
	type Project,
	type ProjectInput,
	type Site,
} from './schema';

export interface ContentIssue {
	path: string;
	message: string;
}

export interface ValidatedContent {
	site: Site;
	projects: Project[];
	issues: ContentIssue[];
}

/**
 * Validates site identity, projects and asset references together. Pure so it
 * can run at build time, in `pnpm content:check`, and in unit tests.
 */
export function validateContent(
	siteInput: unknown,
	projectInputs: ProjectInput[],
	assets: Record<string, Asset>,
): ValidatedContent {
	const issues: ContentIssue[] = [];
	const push = (path: string, message: string) => issues.push({ path, message });

	for (const [id, asset] of Object.entries(assets)) {
		const parsed = assetSchema.safeParse(asset);
		if (!parsed.success)
			parsed.error.issues.forEach((i) => push(`assets.${id}.${i.path.join('.')}`, i.message));
		if (asset.poster && !assets[asset.poster])
			push(`assets.${id}.poster`, `Unknown poster asset "${asset.poster}"`);
	}

	const siteParsed = siteSchema.safeParse(siteInput);
	if (!siteParsed.success)
		siteParsed.error.issues.forEach((i) => push(`site.${i.path.join('.')}`, i.message));
	const site = siteParsed.success ? siteParsed.data : (siteInput as Site);
	if (site?.portrait && !assets[site.portrait]) push('site.portrait', `Unknown asset "${site.portrait}"`);

	const projects: Project[] = [];
	const slugs = new Set<string>();
	projectInputs.forEach((input, index) => {
		const where = `projects[${index}:${input.slug ?? '?'}]`;
		const parsed = projectSchema.safeParse(input);
		if (!parsed.success) {
			parsed.error.issues.forEach((i) => push(`${where}.${i.path.join('.')}`, i.message));
			return;
		}
		const project = parsed.data;
		if (slugs.has(project.slug)) push(`${where}.slug`, `Duplicate slug "${project.slug}"`);
		slugs.add(project.slug);

		const expect = (ref: string, field: string, type: Asset['type']) => {
			const asset = assets[ref];
			if (!asset) return push(`${where}.${field}`, `Unknown asset "${ref}"`);
			if (asset.type !== type)
				push(`${where}.${field}`, `Asset "${ref}" is a ${asset.type}, expected ${type}`);
		};
		expect(project.cover.asset, 'cover.asset', 'image');
		expect(project.socialImage, 'socialImage', 'image');
		const social = assets[project.socialImage];
		if (social && (social.width !== 1200 || social.height !== 630)) {
			push(`${where}.socialImage`, `Social image should be 1200×630, got ${social.width}×${social.height}`);
		}
		project.media.forEach((m, i) => {
			expect(m.asset, `media[${i}].asset`, m.type);
			const asset = assets[m.asset];
			const alt = m.alt ?? asset?.alt;
			if (asset && !alt && m.type === 'image') push(`${where}.media[${i}]`, 'Gallery images need alt text');
		});
		const coverAsset = assets[project.cover.asset];
		if (coverAsset && !(project.cover.alt ?? coverAsset.alt)) push(`${where}.cover`, 'Cover needs alt text');
		if (project.publishStatus === 'published' && /\(sample\)/i.test(project.seoTitle)) {
			push(`${where}.seoTitle`, 'Published project still has a "(sample)" title');
		}
		projects.push(project);
	});

	projects.sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title));
	return { site, projects, issues };
}
