import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';

export const IMAGE_EXT = /\.(jpe?g|png|webp|avif|tiff?)$/i;
export const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv)$/i;
export const MODEL_EXT = /\.glb$/i;

export function hasFfmpeg(): boolean {
	return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
}

export function requireFfmpeg() {
	if (!hasFfmpeg()) {
		throw new Error(
			'ffmpeg is required for video. Install it first:\n' +
				'  macOS:   brew install ffmpeg\n' +
				'  Windows: winget install ffmpeg   (or choco install ffmpeg)\n' +
				'  Linux:   sudo apt install ffmpeg',
		);
	}
}

/**
 * Web-ready still: max 2400px wide (no upscaling), EXIF orientation applied,
 * metadata stripped. Images with transparency become WebP (keeps the alpha
 * channel, e.g. a cut-out portrait); everything else becomes JPEG.
 */
export async function processImage(
	input: string,
	outputWithoutExt: string,
	maxWidth = 2400,
): Promise<string> {
	const img = sharp(input, { failOn: 'error' }).rotate();
	const meta = await img.metadata();
	const alpha = Boolean(meta.hasAlpha);
	const out = `${outputWithoutExt}.${alpha ? 'webp' : 'jpg'}`;
	mkdirSync(dirname(out), { recursive: true });
	const resized = img.resize({ width: maxWidth, withoutEnlargement: true });
	await (alpha ? resized.webp({ quality: 88 }) : resized.jpeg({ quality: 85, mozjpeg: true })).toFile(out);
	return out;
}

/** 1200×630 share image cropped around the centre (or a focal point). */
export async function makeSocialImage(input: string, output: string) {
	mkdirSync(dirname(output), { recursive: true });
	await sharp(input)
		.rotate()
		.resize(1200, 630, { fit: 'cover', position: 'attention' })
		.jpeg({ quality: 82 })
		.toFile(output);
}

export interface VideoResult {
	mp4: string;
	webm: string;
	poster: string;
}

/**
 * Web video set from any source ffmpeg can read: H.264 MP4 (+faststart, plays
 * everywhere), VP9 WebM (smaller, used where supported) and a JPEG poster
 * from the first second. Max 1920px wide; audio removed unless keepAudio
 * (silent loops autoplay reliably only without an audio track).
 */
export function transcodeVideo(
	input: string,
	out: { mp4: string; webm: string; poster: string },
	{ maxWidth = 1920, keepAudio = false }: { maxWidth?: number; keepAudio?: boolean } = {},
): VideoResult {
	requireFfmpeg();
	Object.values(out).forEach((f) => mkdirSync(dirname(f), { recursive: true }));
	const scale = `scale='min(${maxWidth},iw)':-2`;
	const audio = keepAudio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an'];
	const run = (args: string[]) =>
		execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, ...args], { stdio: 'inherit' });
	run([
		'-vf',
		scale,
		'-c:v',
		'libx264',
		'-preset',
		'slow',
		'-crf',
		'23',
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		...audio,
		out.mp4,
	]);
	run([
		'-vf',
		scale,
		'-c:v',
		'libvpx-vp9',
		'-b:v',
		'0',
		'-crf',
		'34',
		'-row-mt',
		'1',
		'-deadline',
		'good',
		...(keepAudio ? ['-c:a', 'libopus', '-b:a', '96k'] : ['-an']),
		out.webm,
	]);
	execFileSync(
		'ffmpeg',
		[
			'-y',
			'-loglevel',
			'error',
			'-ss',
			'0.5',
			'-i',
			input,
			'-frames:v',
			'1',
			'-vf',
			scale,
			'-q:v',
			'3',
			out.poster,
		],
		{ stdio: 'inherit' },
	);
	return out;
}
