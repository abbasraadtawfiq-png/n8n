/**
 * Convert one video for the web:  pnpm media:video <input> [output-folder] [--keep-audio]
 *
 * Writes <name>.mp4, <name>.webm and <name>-poster.jpg next to the input (or
 * into output-folder). Upload them in the CMS as a project's Video block
 * (MP4, WebM, Poster). `pnpm project:add` does this automatically.
 */
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { transcodeVideo, VIDEO_EXT } from './lib/media';

const args = process.argv.slice(2);
const keepAudio = args.includes('--keep-audio');
const [input, outDir] = args.filter((a) => !a.startsWith('--'));
if (!input || !existsSync(input) || !VIDEO_EXT.test(input)) {
	console.error('Usage: pnpm media:video <video file> [output folder] [--keep-audio]');
	process.exit(1);
}
const dir = resolve(outDir ?? dirname(input));
const name = basename(input, extname(input))
	.toLowerCase()
	.replace(/[^a-z0-9]+/g, '-');
const result = transcodeVideo(
	resolve(input),
	{
		mp4: join(dir, `${name}.mp4`),
		webm: join(dir, `${name}.webm`),
		poster: join(dir, `${name}-poster.jpg`),
	},
	{ keepAudio },
);
console.log(`✓ ${result.mp4}\n✓ ${result.webm}\n✓ ${result.poster}`);
