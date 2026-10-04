import Image from 'next/image';
import Link from 'next/link';
import { portrait, site } from '@/content';
import { strings } from '@/content/strings';
import { ArrowIcon } from './Icons';
import { LocalTime } from './LocalTime';
import { MagneticAnchor, MagneticLink } from './MagneticButton';
import styles from './SiteFooter.module.css';

export function Avatar({ className }: { className?: string }) {
	return (
		<span className={[styles.avatar, className].filter(Boolean).join(' ')} aria-hidden="true">
			{portrait ? (
				<Image src={portrait.src} alt="" width={portrait.width} height={portrait.height} sizes="6rem" />
			) : (
				<span className={styles.avatarPlaceholder} />
			)}
		</span>
	);
}

/** Bottom bar shared by the footer and the dark Contact page. */
export function FooterBar() {
	return (
		<div className={styles.bar}>
			<div className={styles.barGroup}>
				<div>
					<p className="label">{strings.footer.version}</p>
					<p>{strings.footer.edition(site.edition)}</p>
				</div>
				<div>
					<p className="label">{strings.footer.localTime}</p>
					<p>
						<LocalTime timeZone={site.location.timeZone} /> · {site.location.city}
					</p>
				</div>
			</div>
			<div className={styles.barGroup}>
				{site.socialProfiles.length > 0 && (
					<div>
						<p className="label">{strings.footer.socials}</p>
						<ul className={styles.socials}>
							{site.socialProfiles.map((s) => (
								<li key={s.href}>
									<a href={s.href} rel="me noopener" target="_blank">
										{s.label}
									</a>
								</li>
							))}
						</ul>
					</div>
				)}
				<div>
					<p className="label">© {site.name}</p>
					<p>
						<Link href="/privacy" className={styles.textLink}>
							{strings.footer.privacy}
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

export function ContactPills() {
	if (!site.email && !site.phone) return null;
	return (
		<div className={styles.pills}>
			{site.email && (
				<MagneticAnchor href={`mailto:${site.email}`} variant="outline-dark" shape="pill">
					{site.email}
				</MagneticAnchor>
			)}
			{site.phone && (
				<MagneticAnchor href={`tel:${site.phone.replace(/[^+\d]/g, '')}`} variant="outline-dark" shape="pill">
					{site.phone}
				</MagneticAnchor>
			)}
		</div>
	);
}

export function SiteFooter() {
	return (
		<footer className={`${styles.footer} on-dark`} data-menu-inert="">
			<div className="container">
				<div className={styles.top}>
					<h2 className={styles.heading}>
						<Avatar />
						<span>
							{strings.footer.heading[0]}
							<br />
							{strings.footer.heading[1]}
						</span>
					</h2>
					<ArrowIcon direction="down-left" className={styles.arrow} />
				</div>
				<div className={styles.line}>
					<MagneticLink href="/contact" variant="accent" className={styles.cta}>
						{strings.footer.cta}
					</MagneticLink>
				</div>
				<ContactPills />
				<FooterBar />
			</div>
		</footer>
	);
}
