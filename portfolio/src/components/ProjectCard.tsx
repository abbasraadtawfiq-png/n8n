import Image from 'next/image';
import Link from 'next/link';
import type { ProjectSummary } from '@/content/summary';
import { strings } from '@/content/strings';
import styles from './ProjectCard.module.css';

export function ProjectCard({
	project,
	titleTag: Title = 'h2',
}: {
	project: ProjectSummary;
	titleTag?: 'h2' | 'h3';
}) {
	return (
		<Link href={`/work/${project.slug}`} className={styles.card}>
			<span className={styles.media} style={{ background: project.accentColor }}>
				<Image
					src={project.cover.src}
					alt=""
					width={project.cover.width}
					height={project.cover.height}
					sizes="(max-width: 48rem) 90vw, 40vw"
					style={{ objectPosition: project.cover.position }}
				/>
			</span>
			<Title className={styles.title}>
				{project.title}
				{project.sample && <span className={styles.sample}>{strings.preview.sample}</span>}
			</Title>
			<span className={styles.meta}>
				<span>{project.categoryLabel}</span>
				<span>{project.year ?? ''}</span>
			</span>
		</Link>
	);
}
