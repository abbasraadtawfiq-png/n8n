'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useSyncExternalStore,
	type ReactNode,
} from 'react';
import { useMediaQuery } from '@/lib/hooks';
import { MEDIA } from '@/lib/motion';

interface MotionState {
	/** OS-level reduced-motion preference. */
	reduced: boolean;
	/** Visitor paused autoplaying motion with the on-page control. */
	paused: boolean;
	setPaused: (paused: boolean) => void;
	/** Continuous/decorative motion may run. */
	allowAutoplay: boolean;
	/** Pointer-driven motion (magnetism, cursor followers) may run. */
	allowPointerMotion: boolean;
}

const MotionContext = createContext<MotionState | null>(null);
const STORAGE_KEY = 'motion-paused';

// Tiny external store so the paused flag survives navigation without a re-render storm.
const listeners = new Set<() => void>();
let pausedValue: boolean | null = null;
function readPaused(): boolean {
	if (pausedValue === null) {
		try {
			pausedValue = window.localStorage.getItem(STORAGE_KEY) === '1';
		} catch {
			pausedValue = false;
		}
	}
	return pausedValue;
}
function writePaused(next: boolean) {
	pausedValue = next;
	try {
		window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
	} catch {
		/* storage unavailable: keep the in-memory value */
	}
	listeners.forEach((l) => l());
}

export function MotionPreferences({ children }: { children: ReactNode }) {
	const reduced = useMediaQuery(MEDIA.reducedMotion);
	const finePointer = useMediaQuery(MEDIA.finePointer);
	const paused = useSyncExternalStore(
		(l) => {
			listeners.add(l);
			return () => listeners.delete(l);
		},
		readPaused,
		() => false,
	);
	const setPaused = useCallback((next: boolean) => writePaused(next), []);

	useEffect(() => {
		document.documentElement.dataset.motion = paused || reduced ? 'paused' : 'running';
	}, [paused, reduced]);

	const value = useMemo<MotionState>(
		() => ({
			reduced,
			paused,
			setPaused,
			allowAutoplay: !reduced && !paused,
			allowPointerMotion: !reduced && finePointer,
		}),
		[reduced, paused, setPaused, finePointer],
	);
	return <MotionContext value={value}>{children}</MotionContext>;
}

export function useMotion(): MotionState {
	const ctx = useContext(MotionContext);
	if (!ctx) throw new Error('useMotion must be used inside <MotionPreferences>');
	return ctx;
}
