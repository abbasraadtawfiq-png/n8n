import Script from 'next/script';
import { analyticsProvider, plausibleDomain, plausibleSrc } from '@/lib/config';
import { VercelAnalyticsLoader } from './VercelAnalyticsLoader';

/**
 * Optional, cookieless page-view analytics (off unless NEXT_PUBLIC_ANALYTICS
 * is set). Neither provider sets cookies or stores personal data, so no
 * consent banner is needed; the privacy page names the active provider.
 */
export function Analytics() {
	if (analyticsProvider === 'vercel') return <VercelAnalyticsLoader />;
	if (analyticsProvider === 'plausible')
		return <Script src={plausibleSrc} data-domain={plausibleDomain} strategy="afterInteractive" />;
	return null;
}
