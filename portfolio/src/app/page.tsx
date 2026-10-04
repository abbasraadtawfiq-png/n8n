import type { Metadata } from 'next';
import { FooterCurve } from '@/components/FooterCurve';
import { Hero } from '@/components/Hero';
import { JsonLd } from '@/components/JsonLd';
import { MagneticLink } from '@/components/MagneticButton';
import { PageTransition } from '@/components/PageTransition';
import { ProjectList } from '@/components/ProjectList';
import { SiteFooter } from '@/components/SiteFooter';
import { SlidingImages } from '@/components/SlidingImages';
import { featuredProjects, projects, site } from '@/content';
import { strings } from '@/content/strings';
import { toSummary } from '@/content/summary';
import { defaultOgImage, pageMetadata, personJsonLd } from '@/lib/seo';
import styles from './home.module.css';

export const metadata: Metadata = pageMetadata({
	description: site.seo.description,
	path: '/',
	image: defaultOgImage,
	type: 'profile',
});

export default function HomePage() {
	const featured = featuredProjects.map(toSummary);
	const all = projects.map(toSummary);

	return (
		<PageTransition>
			<main id="main" tabIndex={-1} data-menu-inert="">
				<Hero />

				<section className={`${styles.intro} container`} aria-labelledby="intro-heading">
					<h2 id="intro-heading" className={styles.statement} data-reveal="">
						{site.statement}
					</h2>
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
		</PageTransition>
	);
}
