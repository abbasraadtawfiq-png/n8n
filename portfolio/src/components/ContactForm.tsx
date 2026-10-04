'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { strings } from '@/content/strings';
import {
	LIMITS,
	quickValidate,
	type ContactField,
	type ContactResponse,
	type FieldErrors,
} from '@/lib/contact/shared';
import { MagneticButton } from './MagneticButton';
import styles from './ContactForm.module.css';

type Status =
	| { kind: 'idle' }
	| { kind: 'sending' }
	| { kind: 'success' }
	| { kind: 'error'; message: string };

const t = strings.contact;

function errorText(code: string | undefined): string | undefined {
	if (!code) return undefined;
	if (code === 'tooLong') return t.errors.tooLong;
	if (code in t.errors) return t.errors[code as 'name' | 'email' | 'message'];
	return t.errors.invalid;
}

const FIELDS: {
	name: ContactField;
	type?: string;
	autoComplete: string;
	required: boolean;
	max: number;
	multiline?: boolean;
}[] = [
	{ name: 'name', autoComplete: 'name', required: true, max: LIMITS.name },
	{ name: 'email', type: 'email', autoComplete: 'email', required: true, max: LIMITS.email },
	{ name: 'company', autoComplete: 'organization', required: false, max: LIMITS.company },
	{ name: 'budget', autoComplete: 'off', required: false, max: LIMITS.budget },
	{ name: 'message', autoComplete: 'off', required: true, max: LIMITS.message, multiline: true },
];

export function ContactForm({
	configured,
	fallbackEmail,
}: {
	configured: boolean;
	fallbackEmail: string | null;
}) {
	const formRef = useRef<HTMLFormElement>(null);
	const [status, setStatus] = useState<Status>({ kind: 'idle' });
	const [errors, setErrors] = useState<FieldErrors>({});
	const idBase = useId();
	const sending = status.kind === 'sending';

	const focusFirstError = (fields: FieldErrors) => {
		const first = FIELDS.find((f) => fields[f.name]);
		if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first.name}"]`)?.focus();
	};

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (sending) return; // prevents duplicate submissions
		const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;

		const fields = quickValidate(data);
		if (Object.keys(fields).length > 0) {
			setErrors(fields);
			setStatus({ kind: 'error', message: t.errors.invalid });
			focusFirstError(fields);
			return;
		}
		setErrors({});
		setStatus({ kind: 'sending' });

		let res: Response;
		try {
			res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
		} catch {
			setStatus({ kind: 'error', message: t.errors.network });
			return;
		}
		const body = (await res.json().catch(() => null)) as ContactResponse | null;

		if (res.ok && body?.ok) {
			setStatus({ kind: 'success' });
			formRef.current?.reset();
			return;
		}
		const code = body && !body.ok ? body.code : undefined;
		if (code === 'invalid' && body && !body.ok && body.fields) {
			setErrors(body.fields);
			focusFirstError(body.fields);
		}
		const message =
			code === 'invalid'
				? t.errors.invalid
				: code === 'rate_limited'
					? t.errors.rateLimited(Math.max(1, Math.ceil(((body && !body.ok && body.retryAfter) || 60) / 60)))
					: code === 'not_configured'
						? t.errors.notConfigured
						: code === 'provider_error'
							? t.errors.provider
							: t.errors.unknown;
		setStatus({ kind: 'error', message });
	}

	return (
		<form
			ref={formRef}
			className={styles.form}
			noValidate
			onSubmit={onSubmit}
			aria-describedby={`${idBase}-required`}
		>
			{!configured && (
				<p className={styles.notice} role="note">
					{t.notConfigured}
					{fallbackEmail && (
						<>
							{' '}
							<a href={`mailto:${fallbackEmail}`}>{fallbackEmail}</a>
						</>
					)}
				</p>
			)}
			<p id={`${idBase}-required`} className={styles.required}>
				{t.required}
			</p>

			{FIELDS.map((f, i) => {
				const id = `${idBase}-${f.name}`;
				const errorId = `${id}-error`;
				const message = errorText(errors[f.name]);
				const common = {
					id,
					name: f.name,
					autoComplete: f.autoComplete,
					required: f.required,
					maxLength: f.max,
					placeholder: t.placeholders[f.name],
					'aria-invalid': message ? true : undefined,
					'aria-describedby': message ? errorId : undefined,
					onInput: () => errors[f.name] && setErrors((prev) => ({ ...prev, [f.name]: undefined })),
				};
				return (
					<div key={f.name} className={styles.field} data-invalid={message ? '' : undefined}>
						<span className={styles.number} aria-hidden="true">
							{String(i + 1).padStart(2, '0')}
						</span>
						<label htmlFor={id} className={styles.label}>
							{t.fields[f.name]}
						</label>
						{f.multiline ? (
							<textarea {...common} rows={5} minLength={LIMITS.messageMin} />
						) : (
							<input {...common} type={f.type ?? 'text'} />
						)}
						{message && (
							<p id={errorId} className={styles.error}>
								{message}
							</p>
						)}
					</div>
				);
			})}

			{/* Honeypot: hidden from sighted users and assistive tech; bots tend to fill it. */}
			<div className={styles.honeypot} aria-hidden="true">
				<label htmlFor={`${idBase}-website`}>Website</label>
				<input id={`${idBase}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
			</div>

			<div className={styles.actions}>
				<MagneticButton type="submit" variant="accent" aria-disabled={sending}>
					{sending ? t.sending : t.submit}
				</MagneticButton>
				<div className={styles.status} role="status" aria-live="polite">
					{status.kind === 'success' && <p className={styles.success}>{t.success}</p>}
					{status.kind === 'error' && <p className={styles.failure}>{status.message}</p>}
				</div>
			</div>
		</form>
	);
}
