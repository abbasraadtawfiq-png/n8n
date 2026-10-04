/** Central motion configuration. Tune timings here rather than in components. */
export const motion = {
	marquee: {
		/** Seconds for one copy of the name to scroll past at rest. */
		secondsPerCopy: 24,
		/** Extra speed added per px/frame of scroll, decays back to 1×. */
		scrollBoost: 0.06,
		maxBoost: 4,
		boostDecay: 0.92,
	},
	magnetic: {
		/** Fraction of pointer offset applied to the button surface / label. */
		surface: 0.35,
		label: 0.18,
		follow: 0.45,
		release: 0.9,
	},
	preview: {
		follow: 0.55,
		cursorFollow: 0.35,
	},
} as const;

export const MEDIA = {
	reducedMotion: '(prefers-reduced-motion: reduce)',
	finePointer: '(hover: hover) and (pointer: fine)',
} as const;
