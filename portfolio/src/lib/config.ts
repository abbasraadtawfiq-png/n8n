/**
 * Public, non-secret deployment configuration. Read at build time for static
 * pages, so changing these requires a rebuild. Secrets live in
 * src/lib/contact/config.ts and never pass through this module.
 */

export interface SiteOrigin {
	/** e.g. "https://yourname.com" without a trailing slash. */
	origin: string;
	isLocal: boolean;
}

export function parseSiteOrigin(raw: string | undefined): SiteOrigin | null {
	if (!raw) return null;
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
	// Only https origins are accepted, except local hosts used for testing.
	if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) return null;
	if (url.pathname !== '/' || url.search || url.hash) return null;
	return { origin: url.origin, isLocal };
}

export const siteOrigin = parseSiteOrigin(process.env.SITE_URL);

/**
 * True only when the owner explicitly allows indexing on a real public
 * origin. Content checks (placeholders, samples) are applied on top of this
 * in src/lib/seo.ts.
 */
export const indexingRequested =
	process.env.SITE_INDEXING === 'allow' && siteOrigin !== null && !siteOrigin.isLocal;

export const webVitalsEnabled = process.env.NEXT_PUBLIC_WEB_VITALS === 'true';

/**
 * Optional privacy-friendly analytics, off by default:
 *  - "vercel": Vercel Web Analytics (cookieless, same-origin script).
 *  - "plausible": Plausible (cookieless); set NEXT_PUBLIC_PLAUSIBLE_DOMAIN.
 */
export const analyticsProvider: 'vercel' | 'plausible' | null =
	process.env.NEXT_PUBLIC_ANALYTICS === 'vercel'
		? 'vercel'
		: process.env.NEXT_PUBLIC_ANALYTICS === 'plausible' && process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
			? 'plausible'
			: null;
export const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? '';
export const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';
