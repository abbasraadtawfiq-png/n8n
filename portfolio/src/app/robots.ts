import type { MetadataRoute } from 'next';
import { absoluteUrl, siteIndexable } from '@/lib/seo';

/**
 * Crawling stays allowed even in preview so crawlers can see each page's
 * `noindex`; blocking here would hide that directive. robots.txt is not
 * access control — protect private previews at the host.
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
		...(siteIndexable ? { sitemap: absoluteUrl('/sitemap.xml') } : {}),
	};
}
