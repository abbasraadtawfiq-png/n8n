import { ViewTransition, type ReactNode } from 'react';

/**
 * Short curtain-style reveal between routes via React's <ViewTransition>
 * (browser View Transitions API). Browsers without support simply swap pages.
 * Styles live in globals.css (.page-enter / .page-exit).
 */
export function PageTransition({ children }: { children: ReactNode }) {
	return (
		<ViewTransition enter="page-enter" exit="page-exit" default="none">
			{children}
		</ViewTransition>
	);
}
