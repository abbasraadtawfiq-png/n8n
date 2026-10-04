'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { strings } from '@/content/strings';
import { navItems, isActivePath } from './nav';
import { useMenu } from './MenuContext';
import styles from './MenuDrawer.module.css';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Floating circular menu trigger (appears once the header has scrolled away)
 * and the right-hand navigation drawer it controls.
 */
export function MenuDrawer({ socials }: { socials: { label: string; href: string }[] }) {
	const { open, toggleMenu, closeMenu } = useMenu();
	const pathname = usePathname();
	const [scrolled, setScrolled] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const drawerId = useId();

	// Show the floating trigger once a sentinel near the top leaves the viewport.
	useEffect(() => {
		const sentinel = document.getElementById('scroll-sentinel');
		if (!sentinel) return;
		const io = new IntersectionObserver(([entry]) =>
			setScrolled(!entry!.isIntersecting && entry!.boundingClientRect.top < 0),
		);
		io.observe(sentinel);
		return () => io.disconnect();
	}, [pathname]);

	// Move focus into the drawer when it opens.
	useEffect(() => {
		if (!open) return;
		const first = rootRef.current?.querySelector<HTMLElement>(`.${styles.links} a`);
		first?.focus({ preventScroll: true });
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: globalThis.KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				closeMenu();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, closeMenu]);

	// Keep Tab within the trigger + drawer while open.
	const trapFocus = (e: KeyboardEvent<HTMLDivElement>) => {
		if (!open || e.key !== 'Tab' || !rootRef.current) return;
		const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			(el) => !el.closest('[inert]'),
		);
		if (items.length === 0) return;
		const first = items[0]!;
		const last = items[items.length - 1]!;
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	};

	return (
		<div ref={rootRef} className={styles.root} data-open={open || undefined} onKeyDown={trapFocus}>
			<button
				ref={buttonRef}
				type="button"
				className={styles.trigger}
				data-visible={scrolled || open || undefined}
				aria-expanded={open}
				aria-controls={drawerId}
				aria-label={open ? strings.menu.close : strings.menu.open}
				onClick={() => toggleMenu(buttonRef.current)}
				inert={!(scrolled || open)}
			>
				<span className={styles.burger} aria-hidden="true" />
			</button>

			<div className={styles.overlay} aria-hidden="true" onClick={() => closeMenu()} />

			<nav id={drawerId} className={styles.drawer} aria-label={strings.nav.navigation} inert={!open}>
				<span className={styles.curve} aria-hidden="true" />
				<div className={styles.inner} data-lenis-prevent="">
					<div>
						<p className={styles.heading}>{strings.nav.navigation}</p>
						<ul className={styles.links}>
							{navItems.map((item, i) => {
								const active = isActivePath(pathname, item.href);
								return (
									<li key={item.href} style={{ '--i': i } as CSSProperties}>
										<Link
											href={item.href}
											aria-current={active ? 'page' : undefined}
											onClick={() => {
												if (active) closeMenu({ restoreFocus: false });
											}}
										>
											<span className={styles.dot} aria-hidden="true" />
											{item.label}
										</Link>
									</li>
								);
							})}
						</ul>
					</div>
					{socials.length > 0 && (
						<div className={styles.socials}>
							<p className={styles.heading}>{strings.menu.socials}</p>
							<ul>
								{socials.map((s) => (
									<li key={s.href}>
										<a href={s.href} rel="me noopener" target="_blank">
											{s.label}
										</a>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			</nav>
		</div>
	);
}
