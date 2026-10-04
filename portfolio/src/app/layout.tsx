import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { MenuDrawer } from '@/components/MenuDrawer';
import { MenuProvider } from '@/components/MenuContext';
import { MotionPreferences } from '@/components/MotionPreferences';
import { RevealController } from '@/components/RevealController';
import { SiteHeader } from '@/components/SiteHeader';
import { WebVitalsLoader } from '@/components/WebVitalsLoader';
import { site } from '@/content';
import { strings } from '@/content/strings';
import { siteOrigin, webVitalsEnabled } from '@/lib/config';
import { isPreview, pageMetadata } from '@/lib/seo';
import '@/styles/globals.css';

// Hanken Grotesk (OFL-1.1), self-hosted. Size-adjusted fallback avoids layout shift.
const sans = localFont({
	src: '../fonts/hanken-grotesk-latin-wght.woff2',
	weight: '100 900',
	variable: '--font-sans',
	display: 'swap',
	adjustFontFallback: 'Arial',
});

// IBM Plex Sans Arabic (OFL-1.1): only downloaded when Arabic characters appear.
const arabic = localFont({
	src: [
		{ path: '../fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', weight: '400' },
		{ path: '../fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2', weight: '500' },
	],
	variable: '--font-arabic',
	display: 'swap',
	preload: false,
	declarations: [
		{ prop: 'unicode-range', value: 'U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF' },
	],
});

export const metadata: Metadata = {
	...(siteOrigin ? { metadataBase: new URL(siteOrigin.origin) } : {}),
	...pageMetadata({ description: site.seo.description, path: '/' }),
	applicationName: site.name,
	formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
	themeColor: '#1c1d20',
	width: 'device-width',
	initialScale: 1,
	viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={`${sans.variable} ${arabic.variable}`}>
			<body>
				<a href="#main" className="skip-link">
					{strings.skipToContent}
				</a>
				<span
					id="scroll-sentinel"
					aria-hidden="true"
					style={{ position: 'absolute', top: '40vh', height: 1, width: 1 }}
				/>
				<MotionPreferences>
					<MenuProvider>
						<SiteHeader shortName={site.shortName} banner={isPreview ? strings.preview.banner : undefined} />
						{children}
						<MenuDrawer socials={site.socialProfiles} />
					</MenuProvider>
				</MotionPreferences>
				<RevealController />
				{webVitalsEnabled && <WebVitalsLoader />}
			</body>
		</html>
	);
}
