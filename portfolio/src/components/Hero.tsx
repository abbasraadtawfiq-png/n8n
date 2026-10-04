import Image from 'next/image';
import { getSite, portraitPlaceholder } from '@/content';
import { strings } from '@/content/strings';
import { ArrowIcon, GlobeIcon } from './Icons';
import { MotionToggle } from './MotionToggle';
import { NameMarquee } from './NameMarquee';
import styles from './Hero.module.css';

export function Hero() {
	const site = getSite();
	const portrait = site.portrait;
	const { city, country } = site.location;
	return (
		<section className={styles.hero} aria-labelledby="hero-title">
			<div className={styles.parallax}>
				<div className={styles.portrait}>
					{portrait ? (
						<Image
							src={portrait.src}
							alt=""
							width={portrait.width}
							height={portrait.height}
							sizes="(max-width: 48rem) 120vw, 60vw"
							preload
							fetchPriority="high"
						/>
					) : (
						<figure className={styles.placeholder}>
							{/* eslint-disable-next-line @next/next/no-img-element -- static SVG silhouette, no optimisation needed */}
							<img
								src={portraitPlaceholder.src}
								alt=""
								width={portraitPlaceholder.width}
								height={portraitPlaceholder.height}
							/>
							<figcaption>{strings.preview.portrait}</figcaption>
						</figure>
					)}
				</div>

				<h1 id="hero-title" className={styles.title}>
					<span className="visually-hidden">
						{site.name} — {site.role}, based in {city}, {country}
					</span>
					<NameMarquee text={site.name} />
				</h1>

				<div className={styles.hanger} aria-hidden="true">
					<p>
						{strings.hero.locatedIn}
						<br />
						{city},
						<br />
						{country}
					</p>
					<span className={styles.globe}>
						<GlobeIcon data-autoplay-motion="" />
					</span>
				</div>

				<div className={styles.role} aria-hidden="true">
					<ArrowIcon className={styles.arrow} />
					<p>
						{site.roleLines[0]}
						<br />
						{site.roleLines[1]}
					</p>
				</div>
			</div>
			<MotionToggle className={styles.motionToggle} />
		</section>
	);
}
