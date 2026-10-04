'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ProjectSummary } from '@/content/summary';
import { strings } from '@/content/strings';
import { withGsap } from '@/lib/gsap';
import { motion } from '@/lib/motion';
import { useMotion } from './MotionPreferences';
import styles from './ProjectList.module.css';

interface Props {
	projects: ProjectSummary[];
	/** Show the column header row (Work page). */
	showHeader?: boolean;
	/** Heading level used for project titles. */
	titleTag?: 'h2' | 'h3';
}

/**
 * Full-width project rows. Every row is a real link. On fine pointers a
 * decorative preview card follows the cursor; on touch, each row shows its
 * own thumbnail instead, so nothing depends on hover.
 */
export function ProjectList({ projects, showHeader = false, titleTag: Title = 'h3' }: Props) {
	const { allowPointerMotion } = useMotion();
	const listRef = useRef<HTMLUListElement>(null);
	const previewRef = useRef<HTMLDivElement>(null);
	const cursorRef = useRef<HTMLDivElement>(null);
	const [active, setActive] = useState<number | null>(null);
	// Preview images are only mounted after the first hover, so they never
	// compete with above-the-fold loading.
	const [armed, setArmed] = useState(false);
	const pathname = usePathname();

	// Clear the preview on route change.
	const [lastPath, setLastPath] = useState(pathname);
	if (pathname !== lastPath) {
		setLastPath(pathname);
		setActive(null);
	}

	useEffect(() => {
		const list = listRef.current;
		const preview = previewRef.current;
		const cursor = cursorRef.current;
		if (!allowPointerMotion || !list || !preview || !cursor) return;

		return withGsap((gsap) => {
			const p = motion.preview;
			const px = gsap.quickTo(preview, 'x', { duration: p.follow, ease: 'power3.out' });
			const py = gsap.quickTo(preview, 'y', { duration: p.follow, ease: 'power3.out' });
			const cx = gsap.quickTo(cursor, 'x', { duration: p.cursorFollow, ease: 'power3.out' });
			const cy = gsap.quickTo(cursor, 'y', { duration: p.cursorFollow, ease: 'power3.out' });

			// Viewport and card size are read on resize only, not per pointer event.
			const card = preview.firstElementChild as HTMLElement;
			const measure = () => ({
				w: window.innerWidth,
				h: window.innerHeight,
				pw: card.offsetWidth,
				ph: card.offsetHeight,
			});
			let bounds = measure();
			const onResize = () => {
				bounds = measure();
			};
			const clamp = (v: number, half: number, max: number) => Math.min(Math.max(v, half), max - half);

			const onMove = (e: PointerEvent) => {
				if (e.pointerType !== 'mouse') return;
				px(clamp(e.clientX, bounds.pw / 2, bounds.w));
				py(clamp(e.clientY, bounds.ph / 2, bounds.h));
				cx(e.clientX);
				cy(e.clientY);
			};
			const onEnter = (e: PointerEvent) => {
				if (e.pointerType !== 'mouse') return;
				setArmed(true);
				onResize();
				gsap.set([preview, cursor], { x: e.clientX, y: e.clientY });
			};
			const clear = () => setActive(null);

			list.addEventListener('pointerenter', onEnter);
			list.addEventListener('pointermove', onMove);
			list.addEventListener('pointerleave', clear);
			list.addEventListener('pointercancel', clear);
			window.addEventListener('blur', clear);
			window.addEventListener('resize', onResize);
			window.addEventListener('menu:open', clear);
			return () => {
				list.removeEventListener('pointerenter', onEnter);
				list.removeEventListener('pointermove', onMove);
				list.removeEventListener('pointerleave', clear);
				list.removeEventListener('pointercancel', clear);
				window.removeEventListener('blur', clear);
				window.removeEventListener('resize', onResize);
				window.removeEventListener('menu:open', clear);
				gsap.killTweensOf([preview, cursor]);
			};
		});
	}, [allowPointerMotion]);

	const visible = allowPointerMotion && active !== null;
	// Years are optional; drop the column entirely rather than show a row of dashes.
	const showYear = showHeader && projects.some((p) => p.year !== null);

	return (
		<div className={styles.wrap} data-pointer={allowPointerMotion || undefined}>
			{showHeader && (
				<div className={styles.header} data-year={showYear || undefined} aria-hidden="true">
					<span>{strings.work.columns.project}</span>
					<span>{strings.work.columns.category}</span>
					<span>{strings.work.columns.role}</span>
					{showYear && <span>{strings.work.columns.year}</span>}
				</div>
			)}
			<ul
				ref={listRef}
				className={styles.list}
				data-columns={showHeader || undefined}
				data-year={showYear || undefined}
			>
				{projects.map((project, i) => (
					<li key={project.slug} className={styles.item} data-category={project.category}>
						<Link
							href={`/work/${project.slug}`}
							className={styles.row}
							onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)}
							onFocus={() => setActive(null)}
						>
							<span className={styles.thumb} style={{ background: project.accentColor }}>
								<Image
									src={project.cover.src}
									alt=""
									width={project.cover.width}
									height={project.cover.height}
									sizes="(max-width: 48rem) 100vw, 25vw"
									style={{ objectPosition: project.cover.position }}
								/>
							</span>
							<Title className={styles.title}>
								{project.title}
								{project.sample && <span className={styles.sample}>{strings.preview.sample}</span>}
							</Title>
							{showHeader && <span className={styles.meta}>{project.categoryLabel}</span>}
							<span className={styles.meta}>{project.roles}</span>
							{showYear && <span className={styles.meta}>{project.year ?? '—'}</span>}
						</Link>
					</li>
				))}
			</ul>

			{allowPointerMotion && (
				<>
					{/* GSAP moves the outer positioners; the inner elements own the show/hide scale. */}
					<div ref={previewRef} className={styles.follower} aria-hidden="true">
						<div className={styles.preview} data-visible={visible || undefined}>
							<div className={styles.slider} style={{ '--index': active ?? 0 } as CSSProperties}>
								{projects.map((project) => (
									<div
										key={project.slug}
										className={styles.slide}
										style={{ background: project.accentColor }}
									>
										{armed && (
											<Image
												src={project.cover.src}
												alt=""
												width={project.cover.width}
												height={project.cover.height}
												sizes="28rem"
												style={{ objectPosition: project.cover.position }}
											/>
										)}
									</div>
								))}
							</div>
						</div>
					</div>
					<div ref={cursorRef} className={`${styles.follower} ${styles.cursorLayer}`} aria-hidden="true">
						<div className={styles.cursor} data-visible={visible || undefined}>
							{strings.work.view}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
