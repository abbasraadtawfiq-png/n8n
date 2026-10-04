import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { Avatar, FooterBar } from '@/components/SiteFooter';
import { SplitText } from '@/components/SplitText';
import { getSite } from '@/content';
import { strings } from '@/content/strings';
import { isContactConfigured } from '@/lib/contact/config';
import { defaultOgImage, pageMetadata } from '@/lib/seo';
import styles from './contact.module.css';

export function generateMetadata(): Metadata {
	const site = getSite();
	return pageMetadata({
		title: 'Contact',
		description: `Start a graphic design or 3D project with ${site.name}.`,
		path: '/contact',
		image: defaultOgImage(),
	});
}

export default function ContactPage() {
	const site = getSite();
	const configured = isContactConfigured();
	const t = strings.contact;

	return (
		<>
			<main id="main" tabIndex={-1} className={`${styles.page} on-dark`} data-menu-inert="">
				<div className="container">
					<SplitText
						as="h1"
						className={styles.headline}
						prefix={<Avatar className={styles.avatar} />}
						text={t.headline}
					/>

					<div className={styles.grid}>
						<ContactForm configured={configured} fallbackEmail={site.email} />

						<aside className={styles.details} aria-label={t.details}>
							{(site.email || site.phone) && (
								<section>
									<h2 className="label">{t.details}</h2>
									<ul>
										{site.email && (
											<li>
												<a href={`mailto:${site.email}`}>{site.email}</a>
											</li>
										)}
										{site.phone && (
											<li>
												<a href={`tel:${site.phone.replace(/[^+\d]/g, '')}`}>{site.phone}</a>
											</li>
										)}
									</ul>
								</section>
							)}
							<section>
								<h2 className="label">{t.location}</h2>
								<p>
									{site.location.city}, {site.location.country}
								</p>
							</section>
							{site.socialProfiles.length > 0 && (
								<section>
									<h2 className="label">{t.socials}</h2>
									<ul>
										{site.socialProfiles.map((s) => (
											<li key={s.href}>
												<a href={s.href} rel="me noopener" target="_blank">
													{s.label}
												</a>
											</li>
										))}
									</ul>
								</section>
							)}
						</aside>
					</div>
				</div>
			</main>
			<footer className={`${styles.footer} on-dark`} data-menu-inert="">
				<div className="container">
					<FooterBar />
				</div>
			</footer>
		</>
	);
}
