import type { ContactMessage } from './schema';

export interface MailProvider {
	readonly name: string;
	/** Resolves when the provider has ACCEPTED the message (not proof of inbox delivery). */
	send(message: ContactMessage): Promise<{ id: string | null }>;
}

export class ProviderError extends Error {
	constructor(
		message: string,
		readonly status: number | null,
	) {
		super(message);
		this.name = 'ProviderError';
	}
}

/**
 * Resend (https://resend.com) over its REST API. Recipient and sender are
 * fixed by server configuration; the visitor's validated address is only
 * used as Reply-To. Plain-text body, so no HTML is ever interpreted.
 */
export class ResendProvider implements MailProvider {
	readonly name = 'resend';

	constructor(
		private readonly apiKey: string,
		private readonly from: string,
		private readonly to: string,
		private readonly fetchImpl: typeof fetch = fetch,
	) {}

	async send(m: ContactMessage): Promise<{ id: string | null }> {
		const lines = [`Name: ${m.name}`, `Email: ${m.email}`];
		if (m.company) lines.push(`Organization: ${m.company}`);
		if (m.budget) lines.push(`Budget: ${m.budget}`);
		lines.push('', m.message);

		let res: Response;
		try {
			res = await this.fetchImpl('https://api.resend.com/emails', {
				method: 'POST',
				headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					from: this.from,
					to: [this.to],
					reply_to: m.email,
					subject: `Portfolio inquiry from ${m.name}`.slice(0, 150),
					text: lines.join('\n'),
				}),
				signal: AbortSignal.timeout(10_000),
			});
		} catch (err) {
			throw new ProviderError(err instanceof Error ? err.name : 'network', null);
		}
		if (!res.ok) throw new ProviderError(`Provider responded ${res.status}`, res.status);
		const body = (await res.json().catch(() => ({}))) as { id?: string };
		return { id: body.id ?? null };
	}
}
