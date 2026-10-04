import { contactSchema, fieldErrors, LIMITS, type ContactResponse } from './schema';
import { ProviderError, type MailProvider } from './provider';
import type { RateLimiter } from './rate-limit';

export interface ContactDeps {
	provider: MailProvider | null;
	limiter: RateLimiter;
	/** Origins allowed to post (the deployment's own origin). */
	allowedOrigins: string[];
	/** Request header holding the client IP, as set by the hosting platform. */
	ipHeader: string;
	log?: (event: string, data?: Record<string, unknown>) => void;
}

const json = (body: ContactResponse, status: number, headers: Record<string, string> = {}) =>
	Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

function clientKey(req: Request, ipHeader: string): string {
	const raw = req.headers.get(ipHeader) ?? '';
	// x-forwarded-for may be a list; the platform-appended client IP is first.
	return raw.split(',')[0]?.trim() || 'unknown';
}

/**
 * Contact form endpoint logic, independent of Next so it can be unit tested.
 * Order: origin → content type → size → rate limit → validation → honeypot →
 * configuration → provider. Success is only returned after the provider
 * accepts the message. Message bodies are never logged.
 */
export async function handleContact(req: Request, deps: ContactDeps): Promise<Response> {
	const log = deps.log ?? (() => undefined);
	const self = new URL(req.url).origin;
	const origin = req.headers.get('origin');
	if (!origin || ![self, ...deps.allowedOrigins].includes(origin)) {
		log('contact.forbidden_origin');
		return json({ ok: false, code: 'forbidden' }, 403);
	}

	if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
		return json({ ok: false, code: 'unsupported_media_type' }, 415);
	}

	const declared = Number(req.headers.get('content-length') ?? '0');
	if (declared > LIMITS.body) return json({ ok: false, code: 'payload_too_large' }, 413);
	const raw = await req.text();
	if (new TextEncoder().encode(raw).byteLength > LIMITS.body)
		return json({ ok: false, code: 'payload_too_large' }, 413);

	try {
		const rl = await deps.limiter.limit(clientKey(req, deps.ipHeader));
		if (!rl.ok) {
			log('contact.rate_limited');
			return json({ ok: false, code: 'rate_limited', retryAfter: rl.retryAfter }, 429, {
				'Retry-After': String(rl.retryAfter),
			});
		}
	} catch (err) {
		// Fail closed: without a working limiter the endpoint could be abused.
		log('contact.rate_limiter_error', { error: err instanceof Error ? err.message : 'unknown' });
		return json({ ok: false, code: 'provider_error' }, 503);
	}

	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return json({ ok: false, code: 'invalid' }, 400);
	}
	const parsed = contactSchema.safeParse(data);
	if (!parsed.success) return json({ ok: false, code: 'invalid', fields: fieldErrors(parsed.error) }, 400);

	if (parsed.data.website) {
		log('contact.honeypot');
		return json({ ok: false, code: 'rejected' }, 422);
	}

	if (!deps.provider) {
		log('contact.not_configured');
		return json({ ok: false, code: 'not_configured' }, 503);
	}

	try {
		const { id } = await deps.provider.send(parsed.data);
		log('contact.accepted', { provider: deps.provider.name, id });
		return json({ ok: true }, 200);
	} catch (err) {
		log('contact.provider_error', {
			provider: deps.provider.name,
			status: err instanceof ProviderError ? err.status : null,
		});
		return json({ ok: false, code: 'provider_error' }, 502);
	}
}
