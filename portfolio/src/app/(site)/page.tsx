import type { Metadata } from 'next';
import { FooterCurve } from '@/components/FooterCurve';
import { Hero } from '@/components/Hero';
import { JsonLd } from '@/components/JsonLd';
import { MagneticLink } from '@/components/MagneticButton';
import { ProjectList } from '@/components/ProjectList';
import { SiteFooter } from '@/components/SiteFooter';
import { SlidingImages } from '@/components/SlidingImages';
import { SplitText } from '@/components/SplitText';
import { getFeaturedProjects, getProjects, getSite } from '@/content';
import { strings } from '@/content/strings';
import { toSummary } from '@/content/summary';
import { defaultOgImage, pageMetadata, personJsonLd } from '@/lib/seo';
import styles from './home.module.css';

export function generateMetadata(): Metadata {
	const site = getSite();
	return pageMetadata({
		description: site.seo.description,
		path: '/',
		image: defaultOgImage(),
		type: 'profile',
	});
}

export default function HomePage() {
	const site = getSite();
	const projects = getProjects();
	const featured = getFeaturedProjects().map(toSummary);
	const all = projects.map(toSummary);

	return (
		<>
			<main id="main" tabIndex={-1} data-menu-inert="">
				<Hero />

				<section className={`${styles.intro} container`} aria-labelledby="intro-heading">
					<SplitText as="h2" id="intro-heading" className={styles.statement} text={site.statement} />
					<div className={styles.aside} data-reveal="">
						<p>{site.intro}</p>
						<MagneticLink href="/about" variant="dark" className={styles.aboutCta}>
							{strings.home.aboutCta}
						</MagneticLink>
					</div>
				</section>

				<section className={`${styles.work} container`} aria-labelledby="work-heading">
					<h2 id="work-heading" className={`label ${styles.workLabel}`}>
						{strings.home.recentWork}
					</h2>
					<ProjectList projects={featured} />
					<div className={styles.more}>
						<MagneticLink href="/work" variant="outline" shape="pill">
							{strings.home.moreWork}
							<sup>{projects.length}</sup>
						</MagneticLink>
					</div>
				</section>

				<SlidingImages projects={all} />
				<FooterCurve />
			</main>
			<SiteFooter />
			<JsonLd data={personJsonLd()} />
		</>
	);
}
