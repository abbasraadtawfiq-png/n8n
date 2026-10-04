'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { PauseIcon, PlayIcon } from './Icons';
import { useMotion } from './MotionPreferences';
import styles from './VideoPoster.module.css';

interface Props {
	sources: { src: string; mime: string }[];
	poster: { src: string; width: number; height: number };
	width: number;
	height: number;
	label: string;
	/** Decorative loops autoplay muted when visible; meaningful videos wait for the visitor. */
	purpose: 'decorative' | 'meaningful';
	sizes: string;
}

/** Only one decorative video decodes at a time across the page. */
let current: HTMLVideoElement | null = null;

/**
 * Poster-first video. The video element (and its bytes) is only created when
 * the poster nears the viewport; playback pauses offscreen, respects reduced
 * motion and the pause control, and falls back to a play button if autoplay
 * is refused.
 */
export function VideoPoster({ sources, poster, width, height, label, purpose, sizes }: Props) {
	const rootRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [near, setNear] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [userPaused, setUserPaused] = useState(false);
	const { allowAutoplay } = useMotion();
	const autoplay = purpose === 'decorative' && allowAutoplay && !userPaused;

	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => e!.isIntersecting && setNear(true), {
			rootMargin: '300px 0px',
		});
		io.observe(el);
		return () => io.disconnect();
	}, []);

	useEffect(() => {
		const video = videoRef.current;
		const el = rootRef.current;
		if (!near || !video || !el) return;
		const play = () => {
			if (current && current !== video) current.pause();
			current = video;
			video.play().catch(() => setPlaying(false));
		};
		const io = new IntersectionObserver(
			([e]) => {
				if (e!.isIntersecting && autoplay) play();
				else video.pause();
			},
			{ threshold: 0.25 },
		);
		io.observe(el);
		const onVisibility = () => document.hidden && video.pause();
		document.addEventListener('visibilitychange', onVisibility);
		if (!autoplay) video.pause();
		return () => {
			io.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			video.pause();
			if (current === video) current = null;
		};
	}, [near, autoplay]);

	const toggle = () => {
		const video = videoRef.current;
		if (!video) {
			setNear(true);
			return;
		}
		if (video.paused) {
			setUserPaused(false);
			if (current && current !== video) current.pause();
			current = video;
			video.play().catch(() => setPlaying(false));
		} else {
			setUserPaused(true);
			video.pause();
		}
	};

	return (
		<div ref={rootRef} className={styles.root} style={{ aspectRatio: `${width} / ${height}` }}>
			<Image
				src={poster.src}
				alt=""
				width={poster.width}
				height={poster.height}
				sizes={sizes}
				className={styles.poster}
			/>
			{near && (
				<video
					ref={videoRef}
					className={styles.video}
					data-ready={playing || undefined}
					muted={purpose === 'decorative'}
					loop={purpose === 'decorative'}
					playsInline
					preload="metadata"
					poster={poster.src}
					controls={purpose === 'meaningful'}
					aria-label={label}
					onPlay={() => setPlaying(true)}
					onPause={() => setPlaying(false)}
				>
					{sources.map((s) => (
						<source key={s.src} src={s.src} type={s.mime} />
					))}
				</video>
			)}
			{purpose === 'decorative' && (
				<button
					type="button"
					className={styles.toggle}
					onClick={toggle}
					aria-label={playing ? `Pause: ${label}` : `Play: ${label}`}
				>
					{playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
				</button>
			)}
		</div>
	);
}
