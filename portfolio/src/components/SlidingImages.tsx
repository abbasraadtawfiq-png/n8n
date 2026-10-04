import Image from 'next/image';
import type { ProjectSummary } from '@/content/summary';
import styles from './SlidingImages.module.css';

/**
 * Two rows of project images that slide in opposite directions while the
 * section scrolls past. Driven by CSS scroll-driven animations (compositor
 * only, no JavaScript); static where unsupported or with reduced motion.
 */
export function SlidingImages({ projects }: { projects: ProjectSummary[] }) {
	if (projects.length === 0) return null;
	const pick = (offset: number) =>
		Array.from({ length: 4 }, (_, i) => projects[(i + offset) % projects.length]!);

	return (
		<div className={styles.root} aria-hidden="true">
			{[pick(0), pick(2)].map((row, r) => (
				<div key={r} className={styles.row}>
					{row.map((p, i) => (
						<div key={`${p.slug}-${i}`} className={styles.tile} style={{ background: p.accentColor }}>
							<Image
								src={p.cover.src}
								alt=""
								width={p.cover.width}
								height={p.cover.height}
								sizes="(max-width: 48rem) 45vw, 22vw"
								style={{ objectPosition: p.cover.position }}
							/>
						</div>
					))}
				</div>
			))}
		</div>
	);
}
