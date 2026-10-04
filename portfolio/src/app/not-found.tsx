import type { Metadata } from 'next';
import { SiteChrome } from '@/components/SiteChrome';
import NotFoundContent from './(site)/not-found';

export const metadata: Metadata = { title: 'Page not found', robots: { index: false, follow: true } };

/** Unmatched URLs render outside the (site) group, so the chrome is added here. */
export default function RootNotFound() {
	return (
		<SiteChrome>
			<NotFoundContent />
		</SiteChrome>
	);
}
