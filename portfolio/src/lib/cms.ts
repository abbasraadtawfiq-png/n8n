/**
 * Whether the CMS admin may run. Local mode writes straight to the server's
 * file system, so it is only allowed in development. Production needs GitHub
 * mode (edits become commits, sign-in through GitHub) with its credentials
 * present; otherwise /keystatic and its API stay disabled (404) instead of
 * breaking the site build.
 */
export function isCmsEnabled(): boolean {
	if (process.env.NODE_ENV !== 'production') return true;
	return (
		process.env.NEXT_PUBLIC_KEYSTATIC_STORAGE === 'github' &&
		Boolean(
			process.env.KEYSTATIC_GITHUB_CLIENT_ID &&
			process.env.KEYSTATIC_GITHUB_CLIENT_SECRET &&
			process.env.KEYSTATIC_SECRET,
		)
	);
}
