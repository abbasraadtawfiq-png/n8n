'use client';

import { useEffect, useState } from 'react';
import styles from './Preloader.module.css';

const STEP_MS = 120;
const FIRST_MS = 420;
const EXIT_MS = 800;

/**
 * Short multilingual "Hello" intro, as on the reference, shown once per
 * browser session. It only appears when the inline boot script (rendered by
 * SiteChrome) marked <html data-preload="run"> before first paint, so it
 * never shows without JavaScript or with reduced motion, and it is gone in
 * about 1.8 s. Content underneath is already rendered and interactive.
 */
export function Preloader({ words }: { words: readonly string[] }) {
	const [index, setIndex] = useState(0);
	const [leaving, setLeaving] = useState(false);

	useEffect(() => {
		const html = document.documentElement;
		if (html.dataset.preload !== 'run') return;
		const timers: number[] = [];
		let t = FIRST_MS;
		for (let i = 1; i < words.length; i++) {
			timers.push(window.setTimeout(() => setIndex(i), t));
			t += STEP_MS;
		}
		timers.push(
			window.setTimeout(() => {
				setLeaving(true);
				window.dispatchEvent(new Event('preloader:done'));
			}, t + 120),
		);
		timers.push(
			window.setTimeout(
				() => {
					delete html.dataset.preload;
					try {
						sessionStorage.setItem('preloaded', '1');
					} catch {
						/* storage unavailable: the intro may show again next visit */
					}
				},
				t + 120 + EXIT_MS,
			),
		);
		return () => timers.forEach(clearTimeout);
	}, [words]);

	return (
		<div className={styles.preloader} data-leaving={leaving || undefined} aria-hidden="true">
			<p className={styles.word}>
				<span className={styles.dot} />
				{words[index]}
			</p>
		</div>
	);
}

/** Runs before first paint: decide whether the intro plays this time. */
export const PRELOAD_BOOT_SCRIPT = `try{document.documentElement.classList.add('js');if(!sessionStorage.getItem('preloaded')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.dataset.preload='run'}}catch(e){}`;
