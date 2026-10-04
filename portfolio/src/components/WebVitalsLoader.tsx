'use client';

import dynamic from 'next/dynamic';

// Separate chunk, only requested when Web Vitals collection is enabled.
export const WebVitalsLoader = dynamic(() => import('./WebVitals').then((m) => m.WebVitals), { ssr: false });
