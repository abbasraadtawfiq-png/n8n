'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ImageAsset } from '@/content/schema';
import { strings } from '@/content/strings';
import styles from './GalleryLightbox.module.css';

/**
 * Full-screen image viewer for a project's gallery. Gallery images are real
 * links to the file (useful without JavaScript); with JavaScript a click
 * opens a modal <dialog> with previous/next, keyboard arrows, swipe, a zoom
 * toggle for detail and focus returned to the clicked image on close.
 */
export function GalleryLightbox({ images, children }: { images: ImageAsset[]; children: ReactNode }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const returnRef = useRef<HTMLElement | null>(null);
	const [index, setIndex] = useState<number | null>(null);
	const [zoom, setZoom] = useState(false);
	const count = images.length;

	const close = useCallback(() => dialogRef.current?.close(), []);
	const step = useCallback(
		(dir: 1 | -1) => {
			setZoom(false);
			setIndex((i) => (i === null ? i : (i + dir + count) % count));
		},
		[count],
	);

	// Open from any gallery link, via event delegation over server-rendered markup.
	useEffect(() => {
		const root = rootRef.current;
		if (!root || count === 0) return;
		const onClick = (e: MouseEvent) => {
			const link = (e.target as HTMLElement).closest<HTMLElement>('[data-lightbox-index]');
			if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
				return;
			e.preventDefault();
			returnRef.current = link;
			setZoom(false);
			setIndex(Number(link.dataset.lightboxIndex));
		};
		root.addEventListener('click', onClick);
		return () => root.removeEventListener('click', onClick);
	}, [count]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (index === null || !dialog || dialog.open) return;
		dialog.showModal();
		document.documentElement.dataset.lightboxOpen = '';
		window.dispatchEvent(new Event('scroll-lock'));
	}, [index]);

	const onClose = () => {
		delete document.documentElement.dataset.lightboxOpen;
		window.dispatchEvent(new Event('scroll-unlock'));
		setIndex(null);
		setZoom(false);
		returnRef.current?.focus({ preventScroll: true });
	};

	// Swipe left/right on touch.
	const swipe = useRef<{ x: number; y: number } | null>(null);

	const current = index === null ? null : images[index];

	return (
		<div ref={rootRef}>
			{children}
			<dialog
				ref={dialogRef}
				className={styles.dialog}
				data-lenis-prevent=""
				aria-label={current ? `${strings.lightbox.label} ${index! + 1} / ${count}` : strings.lightbox.label}
				onClose={onClose}
				onKeyDown={(e) => {
					if (e.key === 'ArrowRight') step(1);
					else if (e.key === 'ArrowLeft') step(-1);
				}}
				onPointerDown={(e) => {
					if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY };
				}}
				onPointerUp={(e) => {
					const s = swipe.current;
					swipe.current = null;
					if (!s || zoom) return;
					const dx = e.clientX - s.x;
					if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) step(dx < 0 ? 1 : -1);
				}}
			>
				{current && (
					<>
						<div className={styles.stage} data-zoom={zoom || undefined}>
							<button
								type="button"
								className={styles.imageButton}
								onClick={() => setZoom((z) => !z)}
								aria-label={zoom ? strings.lightbox.zoomOut : strings.lightbox.zoomIn}
							>
								<Image
									key={current.src}
									src={current.src}
									alt={current.alt}
									width={current.width}
									height={current.height}
									sizes={zoom ? `${Math.min(current.width, 3840)}px` : '100vw'}
									quality={85}
									className={styles.image}
								/>
							</button>
						</div>
						<div className={styles.bar}>
							<p className={styles.caption}>
								<span className={styles.counter}>
									{index! + 1} / {count}
								</span>
								<span>{current.alt}</span>
							</p>
							<div className={styles.controls}>
								{count > 1 && (
									<>
										<button type="button" onClick={() => step(-1)} aria-label={strings.lightbox.previous}>
											←
										</button>
										<button type="button" onClick={() => step(1)} aria-label={strings.lightbox.next}>
											→
										</button>
									</>
								)}
								<button type="button" onClick={close} aria-label={strings.lightbox.close} autoFocus>
									×
								</button>
							</div>
						</div>
						{/* Preload neighbours so stepping feels instant. */}
						{count > 1 &&
							[images[(index! + 1) % count]!, images[(index! - 1 + count) % count]!].map((img) => (
								<Image
									key={`pre-${img.src}`}
									src={img.src}
									alt=""
									width={img.width}
									height={img.height}
									sizes="100vw"
									quality={85}
									loading="eager"
									className={styles.preload}
									aria-hidden="true"
								/>
							))}
					</>
				)}
			</dialog>
		</div>
	);
}
