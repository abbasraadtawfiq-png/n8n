'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ImageAsset } from '@/content/schema';
import { strings } from '@/content/strings';
import { useMotion } from './MotionPreferences';
import styles from './ModelViewer.module.css';

type State = 'poster' | 'loading' | 'ready' | 'error';

/**
 * Interactive .glb viewer. Shows a poster until the visitor asks for the
 * model, then loads Google's <model-viewer> (and three.js) on demand, so
 * nothing 3D is downloaded on page entry. Auto-rotation respects reduced
 * motion; failures show a retry instead of a blank box.
 */
export function ModelViewer({
	src,
	poster,
	label,
	sizes,
}: {
	src: string;
	poster: ImageAsset;
	label: string;
	sizes: string;
}) {
	const [state, setState] = useState<State>('poster');
	const hostRef = useRef<HTMLDivElement>(null);
	const { reduced } = useMotion();

	useEffect(() => {
		if (state !== 'loading') return;
		let cancelled = false;
		const host = hostRef.current;
		import('@google/model-viewer')
			.then(() => {
				if (cancelled || !host) return;
				const viewer = document.createElement('model-viewer');
				viewer.setAttribute('src', src);
				viewer.setAttribute('alt', label);
				viewer.setAttribute('camera-controls', '');
				viewer.setAttribute('touch-action', 'pan-y');
				viewer.setAttribute('shadow-intensity', '0.8');
				viewer.setAttribute('exposure', '1');
				viewer.setAttribute('interaction-prompt', 'none');
				if (!reduced) viewer.setAttribute('auto-rotate', '');
				viewer.className = styles.viewer ?? '';
				viewer.addEventListener('load', () => !cancelled && setState('ready'), { once: true });
				viewer.addEventListener('error', () => !cancelled && setState('error'), { once: true });
				host.replaceChildren(viewer);
			})
			.catch(() => !cancelled && setState('error'));
		return () => {
			cancelled = true;
		};
	}, [state, src, label, reduced]);

	return (
		<div
			className={styles.root}
			style={{ aspectRatio: `${poster.width} / ${poster.height}` }}
			data-state={state}
			data-model-src={src}
		>
			<Image
				src={poster.src}
				alt={state === 'ready' ? '' : label}
				width={poster.width}
				height={poster.height}
				sizes={sizes}
				className={styles.poster}
			/>
			<div ref={hostRef} className={styles.host} />
			{state === 'poster' && (
				<button type="button" className={styles.cta} onClick={() => setState('loading')}>
					<span className={styles.cube} aria-hidden="true" />
					{strings.model.view}
				</button>
			)}
			{state === 'loading' && (
				<p className={styles.status} role="status">
					{strings.model.loading}
				</p>
			)}
			{state === 'ready' && (
				<p className={styles.hint} aria-hidden="true">
					{strings.model.hint}
				</p>
			)}
			{state === 'error' && (
				<div className={styles.status} role="alert">
					<p>{strings.model.error}</p>
					<button type="button" onClick={() => setState('loading')}>
						{strings.model.retry}
					</button>
				</div>
			)}
		</div>
	);
}
