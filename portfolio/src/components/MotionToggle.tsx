'use client';

import { strings } from '@/content/strings';
import { PauseIcon, PlayIcon } from './Icons';
import { useMotion } from './MotionPreferences';

/** Visible pause/play control for autoplaying decorative motion (WCAG 2.2.2). */
export function MotionToggle({ className }: { className?: string }) {
	const { paused, reduced, setPaused } = useMotion();
	// With reduced motion nothing autoplays, so the control is unnecessary.
	if (reduced) return null;
	return (
		<button type="button" className={className} aria-pressed={paused} onClick={() => setPaused(!paused)}>
			{paused ? <PlayIcon width={14} height={14} /> : <PauseIcon width={14} height={14} />}
			<span>{paused ? strings.hero.playMotion : strings.hero.pauseMotion}</span>
		</button>
	);
}
