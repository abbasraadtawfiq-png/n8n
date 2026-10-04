'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Fades/slides `[data-reveal]` elements in as they enter the viewport.
 * Content is fully visible in the server HTML; elements are only hidden after
 * this script runs, and anything already on screen is marked revealed first,
 * so there is no flash and nothing stays hidden if the script fails.
 */
export function RevealController() {
	const pathname = usePathname();

	useEffect(() => {
		if (!('IntersectionObserver' in window)) return;
		const html = document.documentElement;
		const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'));
		const vh = window.innerHeight;
		elements.forEach((el) => {
			if (el.getBoundingClientRect().top < vh) el.dataset.revealed = '';
		});
		html.dataset.revealReady = '';

		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					(entry.target as HTMLElement).dataset.revealed = '';
					io.unobserve(entry.target);
				}
			},
			{ rootMargin: '0px 0px -8% 0px' },
		);
		elements.filter((el) => !('revealed' in el.dataset)).forEach((el) => io.observe(el));
		return () => io.disconnect();
	}, [pathname]);

	return null;
}
