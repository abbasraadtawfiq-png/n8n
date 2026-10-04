/**
 * Contact limits, field names and response types shared by the browser form
 * and the server. Deliberately dependency-free so the form does not ship the
 * server's schema library.
 */
export const LIMITS = {
	name: 100,
	email: 254,
	company: 120,
	budget: 60,
	messageMin: 10,
	message: 5000,
	/** Maximum accepted request body in bytes. */
	body: 16 * 1024,
} as const;

export type ContactField = 'name' | 'email' | 'company' | 'budget' | 'message';
export type FieldErrors = Partial<Record<ContactField, string>>;

/** Error codes the API returns; the form maps them to human messages. */
export type ContactErrorCode =
	| 'invalid'
	| 'rate_limited'
	| 'not_configured'
	| 'provider_error'
	| 'forbidden'
	| 'unsupported_media_type'
	| 'payload_too_large'
	| 'rejected';

export type ContactResponse =
	| { ok: true }
	| { ok: false; code: ContactErrorCode; fields?: FieldErrors; retryAfter?: number };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Quick in-browser check for immediate feedback. The server re-validates
 * everything with the full schema; this only mirrors its rules and codes.
 */
export function quickValidate(data: Record<string, string>): FieldErrors {
	const errors: FieldErrors = {};
	const v = (k: ContactField) => (data[k] ?? '').trim();
	const singleLine = (k: ContactField) => /[\r\n]/.test(data[k] ?? '');
	if (!v('name')) errors.name = 'name';
	else if (v('name').length > LIMITS.name) errors.name = 'tooLong';
	else if (singleLine('name')) errors.name = 'invalid';
	if (!EMAIL.test(v('email'))) errors.email = 'email';
	else if (v('email').length > LIMITS.email) errors.email = 'tooLong';
	if (v('company').length > LIMITS.company) errors.company = 'tooLong';
	if (v('budget').length > LIMITS.budget) errors.budget = 'tooLong';
	if (v('message').length < LIMITS.messageMin) errors.message = 'message';
	else if (v('message').length > LIMITS.message) errors.message = 'tooLong';
	return errors;
}
