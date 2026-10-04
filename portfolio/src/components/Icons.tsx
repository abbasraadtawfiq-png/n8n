import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/** Diagonal arrow pointing down-right (↘), drawn as a stroke icon. */
export function ArrowIcon({
	direction = 'down-right',
	...props
}: IconProps & { direction?: 'down-right' | 'down-left' | 'up-right' }) {
	const rotate = { 'down-right': 0, 'down-left': 90, 'up-right': -90 }[direction];
	return (
		<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
			<g transform={`rotate(${rotate} 12 12)`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
				<path d="M5 5l14 14" />
				<path d="M19 8v11H8" />
			</g>
		</svg>
	);
}

export function GlobeIcon(props: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
			<g stroke="currentColor" strokeWidth="1.2">
				<circle cx="12" cy="12" r="9" />
				<path d="M3 12h18" />
				<ellipse cx="12" cy="12" rx="4" ry="9" />
			</g>
		</svg>
	);
}

export function GridIcon(props: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
			<rect x="4" y="4" width="7" height="7" />
			<rect x="13" y="4" width="7" height="7" />
			<rect x="4" y="13" width="7" height="7" />
			<rect x="13" y="13" width="7" height="7" />
		</svg>
	);
}

export function ListIcon(props: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
			<rect x="4" y="5" width="16" height="2.5" />
			<rect x="4" y="10.75" width="16" height="2.5" />
			<rect x="4" y="16.5" width="16" height="2.5" />
		</svg>
	);
}

export function PauseIcon(props: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
			<rect x="6" y="5" width="4" height="14" />
			<rect x="14" y="5" width="4" height="14" />
		</svg>
	);
}

export function PlayIcon(props: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
			<path d="M7 4.5v15l12-7.5z" />
		</svg>
	);
}
