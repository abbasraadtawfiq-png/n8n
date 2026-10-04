import 'server-only';
import { siteOrigin } from '../config';
import type { ContactDeps } from './handler';
import { ResendProvider } from './provider';
import { MemoryRateLimiter, UpstashRateLimiter, type RateLimiter } from './rate-limit';

/**
 * Server-only contact configuration. Secrets are read from the environment
 * at request time and never exported to client bundles or logged.
 */
const env = (key: string) => process.env[key]?.trim() || undefined;

export function isContactConfigured(): boolean {
	return Boolean(env('RESEND_API_KEY') && env('CONTACT_TO_EMAIL') && env('CONTACT_FROM_EMAIL'));
}

let limiter: RateLimiter | null = null;

function getLimiter(): RateLimiter {
	if (limiter) return limiter;
	const max = Number(env('CONTACT_RATE_LIMIT_MAX') ?? 5);
	const windowSeconds = Number(env('CONTACT_RATE_LIMIT_WINDOW_SECONDS') ?? 600);
	const url = env('UPSTASH_REDIS_REST_URL');
	const token = env('UPSTASH_REDIS_REST_TOKEN');
	limiter =
		url && token
			? new UpstashRateLimiter(url, token, max, windowSeconds)
			: new MemoryRateLimiter(max, windowSeconds * 1000);
	return limiter;
}

export function getContactDeps(): ContactDeps {
	const apiKey = env('RESEND_API_KEY');
	const to = env('CONTACT_TO_EMAIL');
	const from = env('CONTACT_FROM_EMAIL');
	return {
		provider: apiKey && to && from ? new ResendProvider(apiKey, from, to) : null,
		limiter: getLimiter(),
		allowedOrigins: siteOrigin ? [siteOrigin.origin] : [],
		ipHeader: env('CONTACT_IP_HEADER') ?? 'x-forwarded-for',
		log: (event, data) => console.info(JSON.stringify({ event, ...data })),
	};
}
