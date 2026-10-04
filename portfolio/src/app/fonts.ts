import localFont from 'next/font/local';

// Hanken Grotesk (OFL-1.1), self-hosted. Size-adjusted fallback avoids layout shift.
export const sans = localFont({
	src: '../fonts/hanken-grotesk-latin-wght.woff2',
	weight: '100 900',
	variable: '--font-sans',
	display: 'swap',
	adjustFontFallback: 'Arial',
});

// IBM Plex Sans Arabic (OFL-1.1): glyph support only, downloaded only if Arabic characters appear in content.
export const arabic = localFont({
	src: [
		{ path: '../fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', weight: '400' },
		{ path: '../fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2', weight: '500' },
	],
	variable: '--font-arabic',
	display: 'swap',
	preload: false,
	declarations: [
		{ prop: 'unicode-range', value: 'U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF' },
	],
});
