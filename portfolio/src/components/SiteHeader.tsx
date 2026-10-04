'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { strings } from '@/content/strings';
import { useMenu } from './MenuContext';
import { isActivePath, navItems } from './nav';
import styles from './SiteHeader.module.css';

/** Routes whose top area is dark/gray, so the header uses light text. */
const LIGHT_ON = (path: string) => path === '/' || path === '/contact';

/** Identity arrives as props so the content module (and its validator) stays on the server. */
export function SiteHeader({ shortName, banner }: { shortName: string; banner?: string }) {
	const pathname = usePathname();
	const { open, openMenu } = useMenu();
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const theme = LIGHT_ON(pathname) ? 'light' : 'dark';

	return (
		<div className={styles.top} data-menu-inert="">
			{banner && (
				<p className={styles.banner} role="note">
					{banner}
				</p>
			)}
			<header className={styles.header} data-theme={theme}>
				<Link href="/" className={styles.brand}>
					<span className={styles.copyright} aria-hidden="true">
						©
					</span>
					<span className={styles.brandText}>
						<span className={styles.brandPrefix}>{strings.brand.prefix}</span> {shortName}
					</span>
				</Link>

				<nav aria-label={strings.nav.label} className={styles.nav}>
					<ul>
						{navItems
							.filter((item) => item.href !== '/')
							.map((item) => (
								<li key={item.href}>
									<Link
										href={item.href}
										aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
									>
										{item.label}
										<span className={styles.dot} aria-hidden="true" />
									</Link>
								</li>
							))}
					</ul>
				</nav>

				<button
					ref={menuButtonRef}
					type="button"
					className={styles.menuButton}
					aria-expanded={open}
					aria-haspopup="true"
					onClick={() => openMenu(menuButtonRef.current)}
				>
					{strings.nav.menu}
					<span className={styles.menuDot} aria-hidden="true" />
				</button>
			</header>
		</div>
	);
}
