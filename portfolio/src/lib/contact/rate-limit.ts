export interface RateLimitResult {
	ok: boolean;
	/** Seconds until another request is allowed (when !ok). */
	retryAfter: number;
}

export interface RateLimiter {
	readonly kind: 'memory' | 'upstash';
	limit(key: string): Promise<RateLimitResult>;
}

/**
 * Fixed-window limiter kept in this process's memory. Adequate for a single
 * long-running server only: on serverless or multiple instances each copy
 * counts separately, so configure Upstash there (see docs/deployment.md).
 */
export class MemoryRateLimiter implements RateLimiter {
	readonly kind = 'memory';
	private readonly hits = new Map<string, { count: number; resetAt: number }>();

	constructor(
		private readonly max: number,
		private readonly windowMs: number,
		private readonly now: () => number = Date.now,
	) {}

	async limit(key: string): Promise<RateLimitResult> {
		const t = this.now();
		if (this.hits.size > 10_000) this.sweep(t);
		const entry = this.hits.get(key);
		if (!entry || entry.resetAt <= t) {
			this.hits.set(key, { count: 1, resetAt: t + this.windowMs });
			return { ok: true, retryAfter: 0 };
		}
		entry.count += 1;
		const retryAfter = Math.ceil((entry.resetAt - t) / 1000);
		return entry.count > this.max ? { ok: false, retryAfter } : { ok: true, retryAfter: 0 };
	}

	private sweep(t: number) {
		for (const [k, v] of this.hits) if (v.resetAt <= t) this.hits.delete(k);
	}
}

/**
 * Shared fixed-window limiter on Upstash Redis via its REST API (INCR +
 * EXPIRE NX in one pipeline). Works across serverless instances.
 */
export class UpstashRateLimiter implements RateLimiter {
	readonly kind = 'upstash';

	constructor(
		private readonly url: string,
		private readonly token: string,
		private readonly max: number,
		private readonly windowSeconds: number,
		private readonly fetchImpl: typeof fetch = fetch,
	) {}

	async limit(key: string): Promise<RateLimitResult> {
		const redisKey = `contact:rl:${key}`;
		const res = await this.fetchImpl(`${this.url.replace(/\/$/, '')}/pipeline`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify([
				['INCR', redisKey],
				['EXPIRE', redisKey, String(this.windowSeconds), 'NX'],
				['TTL', redisKey],
			]),
			signal: AbortSignal.timeout(3000),
		});
		if (!res.ok) throw new Error(`Rate limiter responded ${res.status}`);
		const [incr, , ttl] = (await res.json()) as { result: number }[];
		const count = Number(incr?.result ?? 0);
		const retryAfter = Math.max(1, Number(ttl?.result ?? this.windowSeconds));
		return count > this.max ? { ok: false, retryAfter } : { ok: true, retryAfter: 0 };
	}
}
