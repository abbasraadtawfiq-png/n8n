'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useMotion } from './MotionPreferences';

type LenisInstance = {
	scrollTo: (target: number, opts?: { immediate?: boolean; force?: boolean }) => void;
	resize: () => void;
	stop: () => void;
	start: () => void;
	destroy: () => void;
};

/**
 * Inertial smooth scrolling (Lenis), loaded on demand for mouse/trackpad
 * users only. Native scrolling stays in place for touch, keyboard, reduced
 * motion and if the library fails to load. It pauses while the menu or the
 * image viewer is open and re-syncs to the scroll position Next sets on
 * navigation (top for new pages, restored for back/forward).
 */
export function SmoothScroll() {
	const { allowPointerMotion } = useMotion();
	const lenisRef = useRef<LenisInstance | null>(null);
	const pathname = usePathname();

	useEffect(() => {
		if (!allowPointerMotion) return;
		let cancelled = false;
		const lock = () => lenisRef.current?.stop();
		const unlock = () => lenisRef.current?.start();
		import('lenis')
			.then(({ default: Lenis }) => {
				if (cancelled) return;
				lenisRef.current = new Lenis({ autoRaf: true, lerp: 0.1, anchors: true }) as unknown as LenisInstance;
				document.documentElement.dataset.smoothScroll = '';
			})
			.catch(() => undefined);
		window.addEventListener('scroll-lock', lock);
		window.addEventListener('scroll-unlock', unlock);
		return () => {
			cancelled = true;
			window.removeEventListener('scroll-lock', lock);
			window.removeEventListener('scroll-unlock', unlock);
			lenisRef.current?.destroy();
			lenisRef.current = null;
			delete document.documentElement.dataset.smoothScroll;
		};
	}, [allowPointerMotion]);

	useEffect(() => {
		const lenis = lenisRef.current;
		if (!lenis) return;
		const id = requestAnimationFrame(() => {
			lenis.resize();
			lenis.scrollTo(window.scrollY, { immediate: true, force: true });
		});
		return () => cancelAnimationFrame(id);
	}, [pathname]);

	return null;
}
