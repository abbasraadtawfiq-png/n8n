'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { strings } from '@/content/strings';
import shell from './shell.module.css';

export default function ErrorBoundary({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error.digest ?? error.message);
	}, [error]);

	return (
		<main id="main" tabIndex={-1} className={`${shell.page} container`}>
			<h1 className={shell.headline}>{strings.error.title}</h1>
			<p className={shell.lede}>{strings.error.body}</p>
			<div className={shell.actions}>
				<button type="button" onClick={reset} style={{ minHeight: 44, textDecoration: 'underline' }}>
					{strings.error.retry}
				</button>
				<Link
					href="/"
					style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', textDecoration: 'underline' }}
				>
					{strings.error.home}
				</Link>
			</div>
		</main>
	);
}
