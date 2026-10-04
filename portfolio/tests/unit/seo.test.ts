import { describe, expect, it } from 'vitest';
import { parseSiteOrigin } from '@/lib/config';
import { isSiteIndexable, personJsonLd, projectJsonLd, serializeJsonLd } from '@/lib/seo';
import { getProjects } from '@/content';

describe('parseSiteOrigin', () => {
	it('accepts https origins and local http for testing', () => {
		expect(parseSiteOrigin('https://yourname.com')).toEqual({
			origin: 'https://yourname.com',
			isLocal: false,
		});
		expect(parseSiteOrigin('http://localhost:3000')).toEqual({
			origin: 'http://localhost:3000',
			isLocal: true,
		});
	});

	it('rejects missing, insecure, malformed or path-bearing values', () => {
		expect(parseSiteOrigin(undefined)).toBeNull();
		expect(parseSiteOrigin('http://yourname.com')).toBeNull();
		expect(parseSiteOrigin('yourname.com')).toBeNull();
		expect(parseSiteOrigin('https://yourname.com/portfolio')).toBeNull();
	});
});

describe('structured data', () => {
	it('escapes characters that could break out of a script element', () => {
		const out = serializeJsonLd({ name: '</script><script>alert(1)</script>&' });
		expect(out).not.toContain('</script>');
		expect(out).not.toContain('&');
		expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>&' });
	});

	it('publishes nothing while the site is a preview with sample content', () => {
		expect(isSiteIndexable()).toBe(false);
		expect(personJsonLd()).toBeNull();
		for (const p of getProjects()) expect(projectJsonLd(p, '/x.jpg')).toBeNull();
	});
});
