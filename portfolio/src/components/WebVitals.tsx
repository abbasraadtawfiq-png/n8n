'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Optional, privacy-conscious field metrics (enable with
 * NEXT_PUBLIC_WEB_VITALS=true). Sends only metric name, value, rating and
 * path — no cookies, identifiers or user agent — to /api/vitals.
 */
export function WebVitals() {
	useReportWebVitals((metric) => {
		const body = JSON.stringify({
			name: metric.name,
			value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
			rating: metric.rating,
			path: window.location.pathname,
		});
		if (!navigator.sendBeacon?.('/api/vitals', new Blob([body], { type: 'application/json' }))) {
			fetch('/api/vitals', {
				method: 'POST',
				body,
				headers: { 'Content-Type': 'application/json' },
				keepalive: true,
			}).catch(() => undefined);
		}
	});
	return null;
}
