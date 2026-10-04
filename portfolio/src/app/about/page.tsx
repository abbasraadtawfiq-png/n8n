import type { Metadata } from 'next';
import Image from 'next/image';
import { FooterCurve } from '@/components/FooterCurve';
import { ArrowIcon } from '@/components/Icons';
import { JsonLd } from '@/components/JsonLd';
import { MagneticLink } from '@/components/MagneticButton';
import { PageTransition } from '@/components/PageTransition';
import { SiteFooter } from '@/components/SiteFooter';
import { portrait, portraitPlaceholder, site } from '@/content';
import { strings } from '@/content/strings';
import { defaultOgImage, pageMetadata, personJsonLd } from '@/lib/seo';
import shell from '../shell.module.css';
import styles from './about.module.css';

export const metadata: Metadata = pageMetadata({
	title: 'About',
	description: `${site.role} based in ${site.location.city}, ${site.location.country}.`,
	path: '/about',
	image: defaultOgImage,
	type: 'profile',
});

export default function AboutPage() {
	return (
		<PageTransition>
			<main id="main" tabIndex={-1} data-menu-inert="">
				<div className={`${shell.page} container`}>
					<h1 className={shell.headline}>{strings.about.headline}</h1>

					<div className={styles.split}>
						<div className={styles.text} data-reveal="">
							<ArrowIcon className={styles.arrow} />
							{site.bio.map((p) => (
								<p key={p}>{p}</p>
							))}
						</div>
						<figure className={styles.portrait} data-reveal="">
							{portrait ? (
								<Image
									src={portrait.src}
									alt={`Portrait of ${site.name}`}
									width={portrait.width}
									height={portrait.height}
									sizes="(max-width: 48rem) 90vw, 40vw"
									preload
								/>
							) : (
								<>
									{/* eslint-disable-next-line @next/next/no-img-element -- static SVG silhouette, no optimisation needed */}
									<img
										src={portraitPlaceholder.src}
										alt=""
										width={portraitPlaceholder.width}
										height={portraitPlaceholder.height}
									/>
									<figcaption>{strings.preview.portrait}</figcaption>
								</>
							)}
						</figure>
					</div>
				</div>

				<section className={`${styles.services} container`} aria-labelledby="services-heading">
					<h2 id="services-heading" className={styles.servicesHeading}>
						{strings.about.helpWith}
					</h2>
					<ol className={styles.serviceList}>
						{site.services.map((s, i) => (
							<li key={s.title} data-reveal="">
								<span className="label">{String(i + 1).padStart(2, '0')}</span>
								<h3>{s.title}</h3>
								<p>{s.description}</p>
							</li>
						))}
					</ol>
					<div className={styles.cta}>
						<MagneticLink href="/contact" variant="dark">
							{strings.about.contactCta}
						</MagneticLink>
					</div>
				</section>
				<FooterCurve />
			</main>
			<SiteFooter />
			<JsonLd data={personJsonLd()} />
		</PageTransition>
	);
}
