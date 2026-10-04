import { z } from 'zod';
import { LIMITS, type ContactField, type FieldErrors } from './shared';

export { LIMITS };
export type { ContactErrorCode, ContactField, ContactResponse } from './shared';

// Single-line fields must not carry line breaks (prevents header injection in subjects).
const singleLine = (max: number) =>
	z
		.string()
		.trim()
		.max(max, 'tooLong')
		.refine((v) => !/[\r\n]/.test(v), 'invalid');

/** Authoritative server-side schema (the browser uses quickValidate from ./shared for instant feedback). */
export const contactSchema = z
	.object({
		name: singleLine(LIMITS.name).pipe(z.string().min(1, 'name')),
		email: z.string().trim().max(LIMITS.email, 'tooLong').pipe(z.email('email')),
		company: singleLine(LIMITS.company).optional().default(''),
		budget: singleLine(LIMITS.budget).optional().default(''),
		message: z.string().trim().min(LIMITS.messageMin, 'message').max(LIMITS.message, 'tooLong'),
		/** Honeypot: hidden from people, must stay empty. */
		website: z.string().max(200).optional().default(''),
	})
	.strict();

export type ContactInput = z.input<typeof contactSchema>;
export type ContactMessage = z.output<typeof contactSchema>;

export function fieldErrors(error: z.ZodError): FieldErrors {
	const out: FieldErrors = {};
	for (const issue of error.issues) {
		const key = issue.path[0];
		if (typeof key === 'string' && key !== 'website' && !(key in out))
			out[key as ContactField] = issue.message;
	}
	return out;
}
