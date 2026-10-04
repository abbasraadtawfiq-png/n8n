import { strings } from '@/content/strings';

export const navItems = [
	{ href: '/', label: strings.nav.home },
	{ href: '/work', label: strings.nav.work },
	{ href: '/about', label: strings.nav.about },
	{ href: '/contact', label: strings.nav.contact },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
	if (href === '/') return pathname === '/';
	return pathname === href || pathname.startsWith(`${href}/`);
}
