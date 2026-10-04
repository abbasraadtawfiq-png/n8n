'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './PageCurtain.module.css';

type Phase = 'idle' | 'cover' | 'covered' | 'reveal';

const COVER_MS = 500;
const REVEAL_MS = 750;
const FAILSAFE_MS = 6000;

/**
 * Reference-style route transition: on an internal link click a dark curtain
 * with the destination's name rises over the page, the route changes behind
 * it, then the curtain lifts away with a curved edge.
 *
 * Only plain left-clicks on same-origin links to a different page are
 * intercepted. Modified clicks (new tab), downloads, external links, hash
 * links, same-page links, browser back/forward and reduced motion all keep
 * native behaviour. A failsafe lifts the curtain if navigation never lands.
 */
export function PageCurtain({ labels }: { labels: Record<string, string> }) {
	const router = useRouter();
	const pathname = usePathname();
	const [phase, setPhase] = useState<Phase>('idle');
	const [label, setLabel] = useState('');
	const [pending, setPending] = useState(false);
	const timers = useRef<number[]>([]);

	const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
	const clearTimers = () => {
		timers.current.forEach(clearTimeout);
		timers.current = [];
	};

	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			const link = (e.target as Element | null)?.closest?.('a[href]');
			if (!(link instanceof HTMLAnchorElement)) return;
			if (link.target && link.target !== '_self') return;
			if (link.hasAttribute('download') || link.dataset.noCurtain !== undefined) return;
			const url = new URL(link.href, window.location.href);
			if (url.origin !== window.location.origin) return;
			if (url.pathname === window.location.pathname) return; // same page (hash, filters)
			if (/^\/(api|keystatic|media|_next)\//.test(url.pathname)) return;
			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

			// Take over before Next's Link handler sees the click.
			e.preventDefault();
			e.stopPropagation();
			const target = url.pathname + url.search + url.hash;
			setPending(true);
			clearTimers();
			setLabel(labelFor(url.pathname, labels));
			setPhase('cover');
			router.prefetch(target);
			later(() => {
				setPhase('covered');
				router.push(target);
			}, COVER_MS);
			// Never leave the page covered if the navigation fails.
			later(() => {
				setPending(false);
				setPhase('reveal');
				later(() => setPhase('idle'), REVEAL_MS);
			}, COVER_MS + FAILSAFE_MS);
		};
		window.addEventListener('click', onClick, { capture: true });
		return () => window.removeEventListener('click', onClick, { capture: true });
	}, [router, labels]);

	// The new route rendered behind the curtain: lift it.
	const [lastPath, setLastPath] = useState(pathname);
	if (pathname !== lastPath) {
		setLastPath(pathname);
		if (pending) {
			setPending(false);
			setPhase('reveal');
		}
	}
	useEffect(() => {
		if (phase !== 'reveal') return;
		clearTimers();
		later(() => setPhase('idle'), REVEAL_MS);
	}, [phase]);

	useEffect(() => clearTimers, []);

	// Lets reveal animations on the new page wait until the curtain lifts.
	useEffect(() => {
		const html = document.documentElement;
		if (phase === 'idle') delete html.dataset.curtain;
		else html.dataset.curtain = phase;
	}, [phase]);

	return (
		<div className={styles.curtain} data-phase={phase} aria-hidden="true">
			<p className={styles.label}>
				<span className={styles.dot} />
				{label}
			</p>
		</div>
	);
}

function labelFor(path: string, labels: Record<string, string>): string {
	if (labels[path]) return labels[path];
	const project = path.match(/^\/work\/([^/]+)$/);
	if (project && labels[`/work/${project[1]}`]) return labels[`/work/${project[1]}`]!;
	return '';
}
