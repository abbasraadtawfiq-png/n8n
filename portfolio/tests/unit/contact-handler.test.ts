import { describe, expect, it, vi } from 'vitest';
import { handleContact, type ContactDeps } from '@/lib/contact/handler';
import { ProviderError, ResendProvider, type MailProvider } from '@/lib/contact/provider';
import { MemoryRateLimiter } from '@/lib/contact/rate-limit';
import { contactSchema, fieldErrors } from '@/lib/contact/schema';
import { quickValidate } from '@/lib/contact/shared';

const ORIGIN = 'http://localhost:3000';
const valid = {
	name: 'Ada Lovelace',
	email: 'ada@example.com',
	company: '',
	budget: '',
	message: 'I would like a poster series.',
};

function request(body: unknown, init: { origin?: string | null; contentType?: string; ip?: string } = {}) {
	const headers = new Headers({
		'content-type': init.contentType ?? 'application/json',
		'x-forwarded-for': init.ip ?? '203.0.113.1',
	});
	if (init.origin !== null) headers.set('origin', init.origin ?? ORIGIN);
	return new Request(`${ORIGIN}/api/contact`, {
		method: 'POST',
		headers,
		body: typeof body === 'string' ? body : JSON.stringify(body),
	});
}

function deps(overrides: Partial<ContactDeps> = {}): ContactDeps {
	const provider: MailProvider = { name: 'mock', send: vi.fn(async () => ({ id: 'msg_1' })) };
	return {
		provider,
		limiter: new MemoryRateLimiter(5, 60_000),
		allowedOrigins: [],
		ipHeader: 'x-forwarded-for',
		...overrides,
	};
}

describe('handleContact', () => {
	it('returns success only after the provider accepts the message', async () => {
		const d = deps();
		const res = await handleContact(request(valid), d);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(d.provider!.send).toHaveBeenCalledOnce();
	});

	it('reports provider failure honestly', async () => {
		const provider: MailProvider = {
			name: 'mock',
			send: vi.fn(async () => Promise.reject(new ProviderError('down', 500))),
		};
		const res = await handleContact(request(valid), deps({ provider }));
		expect(res.status).toBe(502);
		expect(await res.json()).toMatchObject({ ok: false, code: 'provider_error' });
	});

	it('never claims success when no provider is configured', async () => {
		const res = await handleContact(request(valid), deps({ provider: null }));
		expect(res.status).toBe(503);
		expect(await res.json()).toMatchObject({ ok: false, code: 'not_configured' });
	});

	it('rejects cross-origin and origin-less posts', async () => {
		expect((await handleContact(request(valid, { origin: 'https://evil.example' }), deps())).status).toBe(
			403,
		);
		expect((await handleContact(request(valid, { origin: null }), deps())).status).toBe(403);
	});

	it('accepts the configured production origin', async () => {
		const res = await handleContact(
			request(valid, { origin: 'https://portfolio.example' }),
			deps({ allowedOrigins: ['https://portfolio.example'] }),
		);
		expect(res.status).toBe(200);
	});

	it('requires JSON and bounds the payload size', async () => {
		expect(
			(await handleContact(request('name=x', { contentType: 'application/x-www-form-urlencoded' }), deps()))
				.status,
		).toBe(415);
		const huge = { ...valid, message: 'x'.repeat(20_000) };
		expect((await handleContact(request(huge), deps())).status).toBe(413);
	});

	it('validates fields and returns per-field codes', async () => {
		const res = await handleContact(
			request({ ...valid, name: '', email: 'not-an-email', message: 'short' }),
			deps(),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toMatchObject({ ok: false, code: 'invalid' });
		expect(Object.keys(body.fields).sort()).toEqual(['email', 'message', 'name']);
	});

	it('rejects malformed JSON and unknown fields', async () => {
		expect((await handleContact(request('{not json'), deps())).status).toBe(400);
		expect((await handleContact(request({ ...valid, to: 'someone@else.example' }), deps())).status).toBe(400);
	});

	it('blocks header injection through single-line fields', async () => {
		const res = await handleContact(request({ ...valid, name: 'Ada\r\nBcc: x@example.com' }), deps());
		expect(res.status).toBe(400);
	});

	it('rejects honeypot submissions without calling the provider', async () => {
		const d = deps();
		const res = await handleContact(request({ ...valid, website: 'https://spam.example' }), d);
		expect(res.status).toBe(422);
		expect(d.provider!.send).not.toHaveBeenCalled();
	});

	it('rate limits per client and sends Retry-After', async () => {
		const d = deps({ limiter: new MemoryRateLimiter(2, 60_000) });
		await handleContact(request(valid, { ip: '198.51.100.7' }), d);
		await handleContact(request(valid, { ip: '198.51.100.7' }), d);
		const res = await handleContact(request(valid, { ip: '198.51.100.7' }), d);
		expect(res.status).toBe(429);
		expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
		// A different client is unaffected.
		expect((await handleContact(request(valid, { ip: '198.51.100.8' }), d)).status).toBe(200);
	});

	it('fails closed when the shared limiter is unavailable', async () => {
		const limiter = {
			kind: 'upstash' as const,
			limit: vi.fn(async () => Promise.reject(new Error('timeout'))),
		};
		const d = deps({ limiter });
		expect((await handleContact(request(valid), d)).status).toBe(503);
		expect(d.provider!.send).not.toHaveBeenCalled();
	});

	it('does not log message contents', async () => {
		const log = vi.fn();
		await handleContact(request(valid), deps({ log }));
		expect(JSON.stringify(log.mock.calls)).not.toContain(valid.message);
		expect(JSON.stringify(log.mock.calls)).not.toContain(valid.email);
	});
});

describe('ResendProvider', () => {
	it('sends to the fixed recipient with the visitor as Reply-To and a plain-text body', async () => {
		const fetchMock = vi.fn(async () => Response.json({ id: 're_123' }));
		const provider = new ResendProvider(
			'key',
			'Portfolio <form@mail.example>',
			'owner@example.com',
			fetchMock as unknown as typeof fetch,
		);
		const result = await provider.send({ ...valid, company: 'ACME', budget: '', website: '' });
		expect(result.id).toBe('re_123');
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://api.resend.com/emails');
		const payload = JSON.parse(String(init.body));
		expect(payload).toMatchObject({
			from: 'Portfolio <form@mail.example>',
			to: ['owner@example.com'],
			reply_to: 'ada@example.com',
		});
		expect(payload.text).toContain('Organization: ACME');
		expect(payload.html).toBeUndefined();
	});

	it('turns non-2xx responses into ProviderError', async () => {
		const fetchMock = vi.fn(async () => new Response('nope', { status: 422 }));
		const provider = new ResendProvider(
			'key',
			'a@b.example',
			'c@d.example',
			fetchMock as unknown as typeof fetch,
		);
		await expect(provider.send({ ...valid, website: '' })).rejects.toBeInstanceOf(ProviderError);
	});
});

describe('MemoryRateLimiter', () => {
	it('resets after the window', async () => {
		let now = 0;
		const rl = new MemoryRateLimiter(1, 1000, () => now);
		expect((await rl.limit('a')).ok).toBe(true);
		expect((await rl.limit('a')).ok).toBe(false);
		now = 1001;
		expect((await rl.limit('a')).ok).toBe(true);
	});
});

describe('client quickValidate mirrors the server schema', () => {
	const cases: Record<string, string>[] = [
		valid,
		{ ...valid, name: '' },
		{ ...valid, name: 'a\nb' },
		{ ...valid, email: 'nope' },
		{ ...valid, email: 'a@b' },
		{ ...valid, message: 'too short' },
		{ ...valid, message: 'x'.repeat(5001) },
		{ ...valid, company: 'x'.repeat(121) },
		{ ...valid, budget: '  ' },
	];
	it.each(cases.map((c, i) => [i, c] as const))('case %i', (_i, data) => {
		const server = contactSchema.safeParse(data);
		const serverFields = server.success ? {} : fieldErrors(server.error);
		expect(Object.keys(quickValidate(data)).sort()).toEqual(Object.keys(serverFields).sort());
	});
});
