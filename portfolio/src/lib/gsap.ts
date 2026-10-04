'use client';

import type { gsap as GsapType } from 'gsap';

export type Gsap = typeof GsapType;

let promise: Promise<Gsap> | null = null;

/**
 * GSAP (core only) is the single animation library for pointer- and
 * time-driven motion. It is loaded on demand after hydration so it never
 * competes with first paint; scroll-linked effects use CSS scroll-driven
 * animations instead of ScrollTrigger.
 */
export function loadGsap(): Promise<Gsap> {
	promise ??= import('gsap').then((m) => m.gsap);
	return promise;
}

/**
 * Runs `setup` once GSAP has loaded, unless the effect was cleaned up first.
 * Returns the effect cleanup.
 */
export function withGsap(setup: (gsap: Gsap) => (() => void) | void): () => void {
	let cancelled = false;
	let teardown: (() => void) | void;
	loadGsap()
		.then((gsap) => {
			if (!cancelled) teardown = setup(gsap);
		})
		.catch(() => undefined); // motion is an enhancement; the page works without it
	return () => {
		cancelled = true;
		teardown?.();
	};
}
