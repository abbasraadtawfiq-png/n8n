import type { NextConfig } from 'next';
import { projectInputs } from './src/content/projects';
import { PLACEHOLDER_NAME, siteInput } from './src/content/site';
import { indexingRequested, siteOrigin } from './src/lib/config';

const isDev = process.env.NODE_ENV === 'development';
const isPublicHttps = Boolean(siteOrigin && !siteOrigin.isLocal && siteOrigin.origin.startsWith('https://'));

// Mirrors siteIndexable in src/lib/seo.ts (kept dependency-free for the config loader).
const indexable =
	indexingRequested &&
	siteInput.name !== PLACEHOLDER_NAME &&
	!projectInputs.some((p) => p.publishStatus === 'sample');

/**
 * CSP without nonces so pages stay statically rendered. Next's inline
 * bootstrap scripts need 'unsafe-inline' for scripts; everything else is
 * restricted to this origin. See docs/deployment.md for the trade-off.
 */
const csp = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"font-src 'self'",
	"media-src 'self'",
	"connect-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
	...(isPublicHttps ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'X-Frame-Options', value: 'DENY' },
	{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
	{
		key: 'Permissions-Policy',
		value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
	},
	...(isDev ? [] : [{ key: 'Content-Security-Policy', value: csp }]),
	// HSTS only on a real https origin; no includeSubDomains/preload until the domain setup is confirmed.
	...(isPublicHttps ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
	...(indexable ? [] : [{ key: 'X-Robots-Tag', value: 'noindex' }]),
];

const nextConfig: NextConfig = {
	poweredByHeader: false,
	reactStrictMode: true,
	images: {
		formats: ['image/avif', 'image/webp'],
		minimumCacheTTL: 60 * 60 * 24 * 30,
		deviceSizes: [640, 828, 1080, 1440, 1920, 2400],
	},
	async headers() {
		return [
			{ source: '/:path*', headers: securityHeaders },
			{
				// Public media keeps stable names, so cache for a day and revalidate in the background.
				source: '/media/:path*',
				headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
			},
			{ source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
		];
	},
};

export default nextConfig;
