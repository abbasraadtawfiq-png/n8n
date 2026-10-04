import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FooterCurve } from '@/components/FooterCurve';
import { JsonLd } from '@/components/JsonLd';
import { MagneticAnchor, MagneticLink } from '@/components/MagneticButton';
import { PageTransition } from '@/components/PageTransition';
import { ProjectGallery } from '@/components/ProjectGallery';
import { SiteFooter } from '@/components/SiteFooter';
import { CATEGORY_LABELS, getAsset, getNextProject, getProject, projectMeta, projects } from '@/content';
import { strings } from '@/content/strings';
import { pageMetadata, projectJsonLd } from '@/lib/seo';
import styles from './project.module.css';

// Known slugs are pre-rendered; any other slug hits notFound() below and returns a genuine 404.
export function generateStaticParams() {
	return projects.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const project = getProject((await params).slug);
	if (!project) return {};
	const social = getAsset(project.socialImage);
	return pageMetadata({
		title: project.seoTitle,
		description: project.seoDescription,
		path: `/work/${project.slug}`,
		image: { src: social.src, width: social.width, height: social.height, alt: project.title },
		noindex: project.publishStatus !== 'published',
		type: 'article',
	});
}

export default async function ProjectPage({ params }: Props) {
	const project = getProject((await params).slug);
	if (!project) notFound();

	const cover = getAsset(project.cover.asset);
	const next = getNextProject(project.slug);
	const nextCover = next ? getAsset(next.cover.asset) : null;
	const meta = projectMeta(project);
	const sample = project.publishStatus === 'sample';

	return (
		<PageTransition>
			<main id="main" tabIndex={-1} data-menu-inert="">
				<article>
					<header className={`${styles.header} container`}>
						<p className="label">
							<Link href="/work" className={styles.crumb}>
								{strings.nav.work}
							</Link>{' '}
							/ {CATEGORY_LABELS[project.category]}
						</p>
						<h1 className={styles.title}>{project.title}</h1>
						{sample && (
							<p className={styles.sampleNotice} role="note">
								{strings.preview.sampleNotice}
							</p>
						)}
						<dl className={styles.meta}>
							{meta.map((m) => (
								<div key={m.label}>
									<dt className="label">{m.label}</dt>
									<dd>{m.value}</dd>
								</div>
							))}
						</dl>
						<div className={styles.rule}>
							{project.externalLink && (
								<MagneticAnchor
									href={project.externalLink.href}
									target="_blank"
									rel="noopener"
									variant="accent"
									className={styles.live}
								>
									{project.externalLink.label || strings.project.visit}
								</MagneticAnchor>
							)}
						</div>
					</header>

					<div className={styles.coverField} style={{ background: project.accentColor }}>
						<Image
							src={cover.src}
							alt={project.cover.alt ?? cover.alt}
							width={cover.width}
							height={cover.height}
							sizes="(max-width: 48rem) 92vw, 80vw"
							preload
							className={styles.cover}
						/>
					</div>

					<div className={`${styles.body} container`}>
						<div className={styles.intro} data-reveal="">
							<h2 className="label">{strings.project.overview}</h2>
							<p className={styles.lede}>{project.overview}</p>
						</div>
						<div className={styles.columns}>
							{project.challenge && (
								<section data-reveal="">
									<h2 className="label">{strings.project.challenge}</h2>
									<p>{project.challenge}</p>
								</section>
							)}
							{project.approach && (
								<section data-reveal="">
									<h2 className="label">{strings.project.approach}</h2>
									<p>{project.approach}</p>
								</section>
							)}
							{project.deliverables.length > 0 && (
								<section data-reveal="">
									<h2 className="label">{strings.project.deliverables}</h2>
									<ul>
										{project.deliverables.map((d) => (
											<li key={d}>{d}</li>
										))}
									</ul>
								</section>
							)}
							{project.tools && project.tools.length > 0 && (
								<section data-reveal="">
									<h2 className="label">{strings.project.tools}</h2>
									<p>{project.tools.join(', ')}</p>
								</section>
							)}
							{project.verifiedResults && project.verifiedResults.length > 0 && (
								<section data-reveal="">
									<h2 className="label">{strings.project.results}</h2>
									<ul>
										{project.verifiedResults.map((r) => (
											<li key={r}>{r}</li>
										))}
									</ul>
								</section>
							)}
						</div>
					</div>

					<div className="container">
						<ProjectGallery project={project} />
					</div>
				</article>

				<nav className={`${styles.next} container`} aria-label={strings.project.nextCase}>
					{next && nextCover ? (
						<Link href={`/work/${next.slug}`} className={styles.nextLink}>
							<span className="label">{strings.project.nextCase}</span>
							<span className={styles.nextTitle}>{next.title}</span>
							<span className={styles.nextMedia} style={{ background: next.accentColor }}>
								<Image
									src={nextCover.src}
									alt=""
									width={nextCover.width}
									height={nextCover.height}
									sizes="(max-width: 48rem) 70vw, 28vw"
								/>
							</span>
						</Link>
					) : null}
					<div className={styles.allWork}>
						<MagneticLink href="/work" variant="outline" shape="pill">
							{strings.project.allWork}
						</MagneticLink>
					</div>
				</nav>
				<FooterCurve />
			</main>
			<SiteFooter />
			<JsonLd data={projectJsonLd(project, getAsset(project.socialImage).src)} />
		</PageTransition>
	);
}
