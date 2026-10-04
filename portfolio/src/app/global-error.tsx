'use client';

import { strings } from '@/content/strings';

/** Last-resort boundary when the root layout itself fails; must render <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return (
		<html lang="en">
			<body
				style={{
					fontFamily: 'system-ui, sans-serif',
					padding: '10vh 6vw',
					background: '#f5f5f3',
					color: '#1c1d20',
				}}
			>
				<h1 style={{ fontSize: '2.5rem', fontWeight: 400 }}>{strings.error.title}</h1>
				<p>{strings.error.body}</p>
				<p style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem' }}>
					<button
						type="button"
						onClick={reset}
						style={{
							font: 'inherit',
							textDecoration: 'underline',
							background: 'none',
							border: 0,
							cursor: 'pointer',
						}}
					>
						{strings.error.retry}
					</button>
					{/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload is intended when the app shell failed */}
					<a href="/">{strings.error.home}</a>
				</p>
			</body>
		</html>
	);
}
