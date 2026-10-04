import Image from 'next/image';
import { getAsset, type Project } from '@/content';
import { VideoPoster } from './VideoPoster';
import styles from './ProjectGallery.module.css';

/**
 * Large responsive gallery. Images keep their original aspect ratio (no
 * cropping), are lazy-loaded, and sit on a neutral field like the reference.
 * Consecutive "half" items pair up side by side on wide screens.
 */
export function ProjectGallery({ project }: { project: Project }) {
	return (
		<div className={styles.gallery}>
			{project.media.map((item, i) => {
				const asset = getAsset(item.asset);
				const half = item.layout === 'half';
				const sizes = half ? '(max-width: 48rem) 100vw, 45vw' : '(max-width: 48rem) 100vw, 90vw';
				const alt = item.alt ?? asset.alt;
				return (
					<figure key={`${item.asset}-${i}`} className={styles.item} data-layout={item.layout} data-reveal="">
						<div className={styles.field}>
							{item.type === 'video' ? (
								<VideoPoster
									sources={[{ src: asset.src, mime: asset.mime }, ...(asset.alternates ?? [])]}
									poster={getAsset(asset.poster!)}
									width={asset.width}
									height={asset.height}
									label={alt}
									purpose={item.purpose ?? 'decorative'}
									sizes={sizes}
								/>
							) : (
								<Image
									src={asset.src}
									alt={alt}
									width={asset.width}
									height={asset.height}
									sizes={sizes}
									className={styles.image}
								/>
							)}
						</div>
						{item.caption && <figcaption className={styles.caption}>{item.caption}</figcaption>}
					</figure>
				);
			})}
		</div>
	);
}
