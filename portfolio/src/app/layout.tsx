import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { getSite } from '@/content';
import { siteOrigin } from '@/lib/config';
import { pageMetadata } from '@/lib/seo';
import { arabic, sans } from './fonts';

/*
 * Minimal root layout shared by the public site and the CMS admin
 * (/keystatic). Site styles and chrome live in app/(site)/layout.tsx so the
 * admin UI is not affected by them.
 */

export function generateMetadata(): Metadata {
	const site = getSite();
	return {
		...(siteOrigin ? { metadataBase: new URL(siteOrigin.origin) } : {}),
		...pageMetadata({ description: site.seo.description, path: '/' }),
		applicationName: site.name,
		formatDetection: { telephone: false, email: false, address: false },
	};
}

export const viewport: Viewport = {
	themeColor: '#1c1d20',
	width: 'device-width',
	initialScale: 1,
	viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={`${sans.variable} ${arabic.variable}`} suppressHydrationWarning>
			<body>{children}</body>
		</html>
	);
}
