import type { ReactNode } from 'react';
import { getProjects, getSite } from '@/content';
import { strings } from '@/content/strings';
import { webVitalsEnabled } from '@/lib/config';
import { isSiteIndexable } from '@/lib/seo';
import { Analytics } from './Analytics';
import { MenuDrawer } from './MenuDrawer';
import { MenuProvider } from './MenuContext';
import { MotionPreferences } from './MotionPreferences';
import { PageCurtain } from './PageCurtain';
import { PRELOAD_BOOT_SCRIPT, Preloader } from './Preloader';
import { RevealController } from './RevealController';
import { SiteHeader } from './SiteHeader';
import { SmoothScroll } from './SmoothScroll';
import { WebVitalsLoader } from './WebVitalsLoader';
import '@/styles/globals.css';

/** Header, menu and site-wide behaviour around every public page. */
export function SiteChrome({ children }: { children: ReactNode }) {
	const site = getSite();
	// Destination names shown on the page-transition curtain.
	const labels: Record<string, string> = {
		'/': strings.nav.home,
		'/work': strings.nav.work,
		'/about': strings.nav.about,
		'/contact': strings.nav.contact,
		'/privacy': strings.footer.privacy,
		...Object.fromEntries(getProjects().map((p) => [`/work/${p.slug}`, p.title])),
	};
	return (
		<>
			{/* Runs before first paint: marks JS support and whether the intro plays. */}
			<script dangerouslySetInnerHTML={{ __html: PRELOAD_BOOT_SCRIPT }} />
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
					<SiteHeader
						shortName={site.shortName}
						banner={isSiteIndexable() ? undefined : strings.preview.banner}
					/>
					{children}
					<MenuDrawer socials={site.socialProfiles} />
				</MenuProvider>
				<SmoothScroll />
				<Preloader words={strings.preloader} />
			</MotionPreferences>
			<PageCurtain labels={labels} />
			<RevealController />
			{webVitalsEnabled && <WebVitalsLoader />}
			<Analytics />
		</>
	);
}
