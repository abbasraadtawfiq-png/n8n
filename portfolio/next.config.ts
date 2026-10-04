import type { NextConfig } from 'next';
import { loadContent, PLACEHOLDER_NAME } from './src/content/load';
import { analyticsProvider, indexingRequested, plausibleSrc, siteOrigin } from './src/lib/config';

const isDev = process.env.NODE_ENV === 'development';
const isPublicHttps = Boolean(siteOrigin && !siteOrigin.isLocal && siteOrigin.origin.startsWith('https://'));

// Mirrors isSiteIndexable() in src/lib/seo.ts, from the CMS content on disk at build time.
const content = loadContent();
const indexable =
	indexingRequested &&
	content.site.name !== PLACEHOLDER_NAME &&
	!content.projects.some((p) => p.publishStatus === 'sample');

const plausibleOrigin = analyticsProvider === 'plausible' ? new URL(plausibleSrc).origin : '';

/**
 * CSP without nonces so pages stay statically rendered. Next's inline
 * bootstrap scripts need 'unsafe-inline' for scripts; everything else is
 * restricted to this origin. See docs/deployment.md for the trade-off.
 */
const cspFor = ({ admin }: { admin: boolean }) =>
	[
		"default-src 'self'",
		// 'wasm-unsafe-eval' allows WebAssembly compilation only (used by the 3D model viewer), not JS eval.
		`script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''} ${plausibleOrigin}`.trim(),
		`style-src 'self' 'unsafe-inline'${admin ? ' https://fonts.googleapis.com' : ''}`,
		`img-src 'self' data: blob:${admin ? ' https://avatars.githubusercontent.com https://*.githubusercontent.com' : ''}`,
		`font-src 'self' data:${admin ? ' https://fonts.gstatic.com' : ''}`,
		"media-src 'self' blob:",
		`connect-src 'self' ${plausibleOrigin}${admin ? ' https://api.github.com' : ''}`.trim(),
		"worker-src 'self' blob:",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		...(isPublicHttps ? ['upgrade-insecure-requests'] : []),
	].join('; ');

const baseHeaders = [
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'X-Frame-Options', value: 'DENY' },
	{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
	{
		key: 'Permissions-Policy',
		value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
	},
	// HSTS only on a real https origin; no includeSubDomains/preload until the domain setup is confirmed.
	...(isPublicHttps ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
];
const cspHeader = (admin: boolean) =>
	isDev ? [] : [{ key: 'Content-Security-Policy', value: cspFor({ admin }) }];

const nextConfig: NextConfig = {
	poweredByHeader: false,
	reactStrictMode: true,
	images: {
		formats: ['image/avif', 'image/webp'],
		minimumCacheTTL: 60 * 60 * 24 * 30,
		deviceSizes: [640, 828, 1080, 1440, 1920, 2400],
		// 85 is used by the full-screen gallery viewer.
		qualities: [75, 85],
	},
	async headers() {
		const rules = [
			{ source: '/:path*', headers: baseHeaders },
			// Site CSP everywhere except the CMS admin, which also talks to GitHub.
			{ source: '/((?!keystatic|api/keystatic).*)', headers: cspHeader(false) },
			{
				source: '/keystatic/:path*',
				headers: [...cspHeader(true), { key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
			},
			{ source: '/api/keystatic/:path*', headers: cspHeader(true) },
			...(indexable
				? []
				: [{ source: '/((?!keystatic).*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] }]),
			{
				// Public media keeps stable names, so cache for a day and revalidate in the background.
				source: '/media/:path*',
				headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
			},
			{ source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
		];
		// In development the CSP list is empty; Next rejects rules without headers.
		return rules.filter((r) => r.headers.length > 0);
	},
};

export default nextConfig;
