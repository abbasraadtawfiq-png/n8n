import styles from './FooterCurve.module.css';

/**
 * Rounded bottom edge of the page body that flattens as the dark footer
 * scrolls into view (CSS scroll-driven animation). Decorative and static
 * where unsupported or with reduced motion.
 */
export function FooterCurve() {
	return (
		<div className={styles.wrap} aria-hidden="true">
			<div className={styles.curve} />
		</div>
	);
}
