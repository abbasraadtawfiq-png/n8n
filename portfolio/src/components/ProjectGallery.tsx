import Image from 'next/image';
import type { ImageAsset, MediaBlock, Project } from '@/content';
import { CompareSlider } from './CompareSlider';
import { GalleryLightbox } from './GalleryLightbox';
import { ModelViewer } from './ModelViewer';
import { VideoPoster } from './VideoPoster';
import styles from './ProjectGallery.module.css';

/**
 * Large responsive gallery. Images keep their original aspect ratio (no
 * cropping), are lazy-loaded, sit on a neutral field like the reference and
 * open in a full-screen viewer. Consecutive "half" blocks pair up side by
 * side on wide screens.
 */
export function ProjectGallery({ project }: { project: Project }) {
	// Every gallery image block can be opened full-screen, in gallery order.
	const lightboxImages: ImageAsset[] = [];
	const indexOf = (img: ImageAsset) => {
		lightboxImages.push(img);
		return lightboxImages.length - 1;
	};

	const blocks = project.media.map((block, i) => {
		const half = block.layout === 'half';
		const sizes = half ? '(max-width: 48rem) 100vw, 45vw' : '(max-width: 48rem) 100vw, 90vw';
		return (
			<figure
				key={i}
				className={styles.item}
				data-layout={block.layout}
				data-kind={block.type}
				data-reveal=""
			>
				<div className={styles.field}>{renderBlock(block, sizes, indexOf)}</div>
				{block.caption && <figcaption className={styles.caption}>{block.caption}</figcaption>}
			</figure>
		);
	});

	return (
		<GalleryLightbox images={lightboxImages}>
			<div className={styles.gallery}>{blocks}</div>
		</GalleryLightbox>
	);
}

function renderBlock(block: MediaBlock, sizes: string, indexOf: (img: ImageAsset) => number) {
	switch (block.type) {
		case 'image': {
			const index = indexOf(block.image);
			return (
				// A real link to the file: without JavaScript it opens the full image.
				<a
					href={block.image.src}
					className={styles.zoom}
					data-lightbox-index={index}
					aria-label={`View full screen: ${block.image.alt}`}
				>
					<Image
						src={block.image.src}
						alt={block.image.alt}
						width={block.image.width}
						height={block.image.height}
						sizes={sizes}
						className={styles.image}
					/>
				</a>
			);
		}
		case 'video':
			return (
				<VideoPoster
					sources={block.sources}
					poster={block.poster}
					width={block.poster.width}
					height={block.poster.height}
					label={block.label}
					purpose={block.purpose}
					sizes={sizes}
				/>
			);
		case 'compare':
			return (
				<CompareSlider
					before={{ ...block.before, alt: `${block.beforeLabel}: ${block.label}` }}
					after={{ ...block.after, alt: `${block.afterLabel}: ${block.label}` }}
					beforeLabel={block.beforeLabel}
					afterLabel={block.afterLabel}
					label={block.label}
					sizes={sizes}
				/>
			);
		case 'model':
			return <ModelViewer src={block.src} poster={block.poster} label={block.label} sizes={sizes} />;
	}
}
