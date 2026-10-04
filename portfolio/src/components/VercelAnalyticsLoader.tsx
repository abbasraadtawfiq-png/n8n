'use client';

import dynamic from 'next/dynamic';

// Separate chunk, only requested when Vercel Analytics is enabled.
export const VercelAnalyticsLoader = dynamic(() => import('@vercel/analytics/next').then((m) => m.Analytics), {
	ssr: false,
});
