import { webVitalsEnabled } from '@/lib/config';

const NAMES = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);

/**
 * Receives optional Web Vitals beacons and writes one structured log line per
 * metric (no IP, user agent or identifiers). Disabled unless
 * NEXT_PUBLIC_WEB_VITALS=true.
 */
export async function POST(request: Request) {
	if (!webVitalsEnabled) return new Response(null, { status: 404 });
	const raw = await request.text();
	if (raw.length > 1024) return new Response(null, { status: 413 });
	try {
		const m = JSON.parse(raw) as { name?: unknown; value?: unknown; rating?: unknown; path?: unknown };
		if (typeof m.name !== 'string' || !NAMES.has(m.name) || typeof m.value !== 'number')
			return new Response(null, { status: 400 });
		const path = typeof m.path === 'string' ? m.path.slice(0, 120) : '';
		console.info(
			JSON.stringify({ event: 'web-vital', name: m.name, value: m.value, rating: m.rating, path }),
		);
	} catch {
		return new Response(null, { status: 400 });
	}
	return new Response(null, { status: 204 });
}
