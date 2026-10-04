'use client';

import { usePathname } from 'next/navigation';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';

interface MenuState {
	open: boolean;
	/** Opens the menu and remembers which control to return focus to. */
	openMenu: (trigger: HTMLElement | null) => void;
	closeMenu: (options?: { restoreFocus?: boolean }) => void;
	toggleMenu: (trigger: HTMLElement | null) => void;
}

const MenuContext = createContext<MenuState | null>(null);

/** Elements outside the menu that become inert while it is open. */
const INERT_SELECTOR = '[data-menu-inert]';

export function MenuProvider({ children }: { children: ReactNode }) {
	// `restoreFocus` decides where focus goes after closing: back to the
	// trigger (Escape, close button) or left to the new page (navigation).
	const [state, setState] = useState({ open: false, restoreFocus: true });
	const triggerRef = useRef<HTMLElement | null>(null);
	const wasOpenRef = useRef(false);
	const pathname = usePathname();

	const openMenu = useCallback((trigger: HTMLElement | null) => {
		triggerRef.current = trigger;
		setState({ open: true, restoreFocus: true });
	}, []);
	const closeMenu = useCallback((options?: { restoreFocus?: boolean }) => {
		setState({ open: false, restoreFocus: options?.restoreFocus ?? true });
	}, []);
	const toggleMenu = useCallback(
		(trigger: HTMLElement | null) => (state.open ? closeMenu() : openMenu(trigger)),
		[state.open, closeMenu, openMenu],
	);

	// Navigating always closes the menu; focus then belongs to the new page.
	const [lastPath, setLastPath] = useState(pathname);
	if (pathname !== lastPath) {
		setLastPath(pathname);
		if (state.open) setState({ open: false, restoreFocus: false });
	}

	// While open: lock scroll and make the rest of the page inert.
	useEffect(() => {
		if (!state.open) return;
		wasOpenRef.current = true;
		const html = document.documentElement;
		const isolated = Array.from(document.querySelectorAll<HTMLElement>(INERT_SELECTOR));
		html.dataset.menuOpen = '';
		isolated.forEach((el) => (el.inert = true));
		window.dispatchEvent(new Event('menu:open'));
		window.dispatchEvent(new Event('scroll-lock'));
		return () => {
			window.dispatchEvent(new Event('scroll-unlock'));
			delete html.dataset.menuOpen;
			isolated.forEach((el) => (el.inert = false));
		};
	}, [state.open]);

	// After closing (and after inert is lifted), return focus to the trigger if it is still usable.
	useEffect(() => {
		if (state.open || !wasOpenRef.current) return;
		wasOpenRef.current = false;
		const trigger = triggerRef.current;
		if (state.restoreFocus && trigger?.isConnected && trigger.getClientRects().length > 0) trigger.focus();
	}, [state]);

	const value = useMemo(
		() => ({ open: state.open, openMenu, closeMenu, toggleMenu }),
		[state.open, openMenu, closeMenu, toggleMenu],
	);
	return <MenuContext value={value}>{children}</MenuContext>;
}

export function useMenu(): MenuState {
	const ctx = useContext(MenuContext);
	if (!ctx) throw new Error('useMenu must be used inside <MenuProvider>');
	return ctx;
}
