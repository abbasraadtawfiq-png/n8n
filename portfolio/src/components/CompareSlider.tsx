'use client';

import Image from 'next/image';
import { useState, type CSSProperties } from 'react';
import type { ImageAsset } from '@/content/schema';
import { strings } from '@/content/strings';
import styles from './CompareSlider.module.css';

interface Props {
	before: ImageAsset;
	after: ImageAsset;
	beforeLabel: string;
	afterLabel: string;
	label: string;
	sizes: string;
}

/**
 * Before/after comparison (e.g. wireframe vs final render). A transparent
 * native range input covers the images, so dragging anywhere, touch,
 * keyboard arrows and screen readers all work without custom gesture code.
 */
export function CompareSlider({ before, after, beforeLabel, afterLabel, label, sizes }: Props) {
	const [pos, setPos] = useState(50);
	return (
		<div
			className={styles.root}
			style={{ aspectRatio: `${after.width} / ${after.height}`, '--pos': `${pos}%` } as CSSProperties}
		>
			<Image
				src={after.src}
				alt={after.alt}
				width={after.width}
				height={after.height}
				sizes={sizes}
				className={styles.image}
			/>
			<div className={styles.before} aria-hidden="true">
				<Image
					src={before.src}
					alt=""
					width={before.width}
					height={before.height}
					sizes={sizes}
					className={styles.image}
				/>
			</div>
			<span className={`${styles.tag} ${styles.tagBefore}`} aria-hidden="true">
				{beforeLabel}
			</span>
			<span className={`${styles.tag} ${styles.tagAfter}`} aria-hidden="true">
				{afterLabel}
			</span>
			<span className={styles.handle} aria-hidden="true">
				<span className={styles.knob}>↔</span>
			</span>
			<input
				type="range"
				min={0}
				max={100}
				step={1}
				value={pos}
				onChange={(e) => setPos(Number(e.target.value))}
				className={styles.range}
				aria-label={strings.compare.slider(label)}
				aria-valuetext={`${pos}% ${beforeLabel}, ${100 - pos}% ${afterLabel}`}
			/>
		</div>
	);
}
