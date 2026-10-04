'use client';

import Link from 'next/link';
import { useEffect, useRef, type ComponentProps, type ReactNode, type RefObject } from 'react';
import { withGsap } from '@/lib/gsap';
import { motion } from '@/lib/motion';
import { useMotion } from './MotionPreferences';
import styles from './MagneticButton.module.css';

type Variant = 'dark' | 'accent' | 'outline' | 'outline-dark';
type Shape = 'circle' | 'pill';

interface Look {
	variant?: Variant;
	shape?: Shape;
	className?: string;
	children: ReactNode;
}

/**
 * Leans the visible surface towards the pointer while the hit area (the
 * link/button itself) stays put. Inactive on touch and with reduced motion.
 */
function useMagnetic(
	hostRef: RefObject<HTMLElement | null>,
	surfaceRef: RefObject<HTMLElement | null>,
	labelRef: RefObject<HTMLElement | null>,
) {
	const { allowPointerMotion } = useMotion();

	useEffect(() => {
		const host = hostRef.current;
		const surface = surfaceRef.current;
		const label = labelRef.current;
		if (!host || !surface || !label || !allowPointerMotion) return;

		return withGsap((gsap) => {
			const cfg = motion.magnetic;
			const to = (el: HTMLElement, prop: 'x' | 'y') =>
				gsap.quickTo(el, prop, { duration: cfg.follow, ease: 'power3.out' });
			const [sx, sy, lx, ly] = [to(surface, 'x'), to(surface, 'y'), to(label, 'x'), to(label, 'y')];
			let rect: DOMRect | null = null;

			const enter = () => {
				rect = host.getBoundingClientRect();
			};
			const move = (e: PointerEvent) => {
				if (e.pointerType !== 'mouse') return;
				rect ??= host.getBoundingClientRect();
				const dx = e.clientX - (rect.left + rect.width / 2);
				const dy = e.clientY - (rect.top + rect.height / 2);
				sx(dx * cfg.surface);
				sy(dy * cfg.surface);
				lx(dx * cfg.label);
				ly(dy * cfg.label);
			};
			const leave = () => {
				rect = null;
				gsap.to([surface, label], {
					x: 0,
					y: 0,
					duration: cfg.release,
					ease: 'elastic.out(1, 0.35)',
					overwrite: true,
				});
			};

			host.addEventListener('pointerenter', enter);
			host.addEventListener('pointermove', move);
			host.addEventListener('pointerleave', leave);
			host.addEventListener('pointercancel', leave);
			window.addEventListener('blur', leave);
			return () => {
				host.removeEventListener('pointerenter', enter);
				host.removeEventListener('pointermove', move);
				host.removeEventListener('pointerleave', leave);
				host.removeEventListener('pointercancel', leave);
				window.removeEventListener('blur', leave);
				gsap.killTweensOf([surface, label]);
				gsap.set([surface, label], { clearProps: 'transform' });
			};
		});
	}, [allowPointerMotion, hostRef, surfaceRef, labelRef]);
}

function useMagneticParts<T extends HTMLElement>({
	variant = 'dark',
	shape = 'circle',
	className,
	children,
}: Look) {
	const hostRef = useRef<T>(null);
	const surfaceRef = useRef<HTMLSpanElement>(null);
	const labelRef = useRef<HTMLSpanElement>(null);
	useMagnetic(hostRef, surfaceRef, labelRef);
	const classes = [styles.host, styles[shape], styles[variant], className].filter(Boolean).join(' ');
	const inner = (
		<span ref={surfaceRef} className={styles.surface}>
			<span className={styles.fill} aria-hidden="true" />
			<span ref={labelRef} className={styles.label}>
				{children}
			</span>
		</span>
	);
	return { hostRef, classes, inner };
}

type MagneticLinkProps = Look & Omit<ComponentProps<typeof Link>, 'className' | 'children'>;

export function MagneticLink({ variant, shape, className, children, ...linkProps }: MagneticLinkProps) {
	const { hostRef, classes, inner } = useMagneticParts<HTMLAnchorElement>({
		variant,
		shape,
		className,
		children,
	});
	return (
		<Link ref={hostRef} className={classes} {...linkProps}>
			{inner}
		</Link>
	);
}

/** Plain anchor for non-route targets such as mailto: and tel: links. */
export function MagneticAnchor({
	variant,
	shape,
	className,
	children,
	...anchorProps
}: Look & Omit<ComponentProps<'a'>, 'className' | 'children'>) {
	const { hostRef, classes, inner } = useMagneticParts<HTMLAnchorElement>({
		variant,
		shape,
		className,
		children,
	});
	return (
		<a ref={hostRef} className={classes} {...anchorProps}>
			{inner}
		</a>
	);
}

export function MagneticButton({
	variant,
	shape,
	className,
	children,
	type = 'button',
	...buttonProps
}: Look & Omit<ComponentProps<'button'>, 'className' | 'children'>) {
	const { hostRef, classes, inner } = useMagneticParts<HTMLButtonElement>({
		variant,
		shape,
		className,
		children,
	});
	return (
		<button ref={hostRef} type={type} className={classes} {...buttonProps}>
			{inner}
		</button>
	);
}
