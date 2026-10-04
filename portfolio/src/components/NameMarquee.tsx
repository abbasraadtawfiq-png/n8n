'use client';

import { useEffect, useRef, useState } from 'react';
import { withGsap } from '@/lib/gsap';
import { motion } from '@/lib/motion';
import { useMotion } from './MotionPreferences';
import styles from './NameMarquee.module.css';

/**
 * Oversized name scrolling horizontally. Purely visual: the accessible name
 * lives in the page's <h1>, so the whole strip is aria-hidden.
 *
 * Direction follows scroll direction and speed briefly boosts while
 * scrolling. Runs on GSAP's shared ticker (one rAF loop), writes a single
 * transform per frame, and stops when offscreen, paused or reduced.
 */
export function NameMarquee({ text }: { text: string }) {
	const trackRef = useRef<HTMLDivElement>(null);
	const copyRef = useRef<HTMLSpanElement>(null);
	const [copies, setCopies] = useState(3);
	const { allowAutoplay } = useMotion();

	// Enough copies to cover the viewport plus one copy of overlap. Recomputed
	// only when fonts settle or the size changes — never per frame.
	useEffect(() => {
		const copy = copyRef.current;
		if (!copy) return;
		const measure = () => {
			const w = copy.offsetWidth;
			if (w > 0) setCopies(Math.min(8, Math.ceil(window.innerWidth / w) + 1));
		};
		const ro = new ResizeObserver(measure);
		ro.observe(copy);
		document.fonts?.ready.then(measure).catch(() => undefined);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const track = trackRef.current;
		const copy = copyRef.current;
		if (!track || !copy || !allowAutoplay) return;

		return withGsap((gsap) => {
			const cfg = motion.marquee;
			let x = 0;
			let direction = -1;
			let boost = 0;
			let width = copy.offsetWidth;
			let visible = true;
			let lastScroll = window.scrollY;

			const tick = (_time: number, deltaMs: number) => {
				if (!visible || width === 0) return;
				const speed = width / cfg.secondsPerCopy; // px per second
				x += direction * speed * (1 + boost) * (Math.min(deltaMs, 64) / 1000);
				boost *= cfg.boostDecay;
				// Wrap within one copy width so the loop has no seam.
				if (x <= -width) x += width;
				if (x > 0) x -= width;
				track.style.transform = `translate3d(${x}px,0,0)`;
			};
			const onScroll = () => {
				const y = window.scrollY;
				const delta = y - lastScroll;
				lastScroll = y;
				if (delta !== 0) direction = delta > 0 ? -1 : 1;
				boost = Math.min(cfg.maxBoost, boost + Math.abs(delta) * cfg.scrollBoost);
			};
			const ro = new ResizeObserver(() => {
				width = copy.offsetWidth;
			});
			const io = new IntersectionObserver(([entry]) => {
				visible = entry!.isIntersecting;
			});

			ro.observe(copy);
			io.observe(track);
			window.addEventListener('scroll', onScroll, { passive: true });
			gsap.ticker.add(tick);
			return () => {
				gsap.ticker.remove(tick);
				window.removeEventListener('scroll', onScroll);
				ro.disconnect();
				io.disconnect();
			};
		});
	}, [allowAutoplay]);

	return (
		<div className={styles.marquee} aria-hidden="true">
			<div ref={trackRef} className={styles.track}>
				{Array.from({ length: copies }, (_, i) => (
					<span key={i} ref={i === 0 ? copyRef : undefined} className={styles.copy}>
						{text}
						<span className={styles.dash}>—</span>
					</span>
				))}
			</div>
		</div>
	);
}
