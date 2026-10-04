'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Reveals `[data-reveal]` elements as they enter the viewport.
 *  - Blocks fade/slide in. They are visible in the server HTML and only
 *    hidden once this script runs; anything already on screen is marked
 *    revealed first, so there is no flash.
 *  - Split headlines (data-reveal="split") animate word by word, including
 *    those already on screen, after the intro preloader (if any) has gone.
 */
export function RevealController() {
	const pathname = usePathname();

	useEffect(() => {
		if (!('IntersectionObserver' in window)) return;
		const html = document.documentElement;
		const all = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'));
		const vh = window.innerHeight;
		const inView = (el: HTMLElement) => el.getBoundingClientRect().top < vh;
		const reveal = (el: HTMLElement) => (el.dataset.revealed = '');

		all.filter((el) => el.dataset.reveal !== 'split' && inView(el)).forEach(reveal);
		html.dataset.revealReady = '';

		// On-screen headlines animate once the preloader has cleared.
		const onScreenSplits = all.filter((el) => el.dataset.reveal === 'split' && inView(el));
		let raf = 0;
		const playSplits = () => {
			raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => onScreenSplits.forEach(reveal))));
		};
		let timer = 0;
		if (html.dataset.preload === 'run') window.addEventListener('preloader:done', playSplits, { once: true });
		else if (html.dataset.curtain)
			timer = window.setTimeout(playSplits, 250); // let the curtain start lifting
		else playSplits();

		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					reveal(entry.target as HTMLElement);
					io.unobserve(entry.target);
				}
			},
			{ rootMargin: '0px 0px -8% 0px' },
		);
		all
			.filter((el) => !onScreenSplits.includes(el) && !('revealed' in el.dataset))
			.forEach((el) => io.observe(el));
		return () => {
			io.disconnect();
			cancelAnimationFrame(raf);
			clearTimeout(timer);
			window.removeEventListener('preloader:done', playSplits);
		};
	}, [pathname]);

	return null;
}
