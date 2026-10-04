'use client';

import { useEffect, useState } from 'react';

function format(timeZone: string, now: Date) {
	const time = new Intl.DateTimeFormat('en-GB', {
		timeZone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).format(now);
	const offset =
		new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
			.formatToParts(now)
			.find((p) => p.type === 'timeZoneName')?.value ?? '';
	return { time, offset, iso: now.toISOString() };
}

/**
 * Current time in the owner's time zone. Server HTML renders a neutral
 * placeholder; the real time appears after mount, so there is no hydration
 * mismatch. Updates on each minute boundary.
 */
export function LocalTime({ timeZone }: { timeZone: string }) {
	const [value, setValue] = useState<ReturnType<typeof format> | null>(null);

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;
		const tick = () => {
			const now = new Date();
			setValue(format(timeZone, now));
			timer = setTimeout(tick, 60_000 - (now.getTime() % 60_000) + 50);
		};
		tick();
		return () => clearTimeout(timer);
	}, [timeZone]);

	if (!value) return <span aria-hidden="true">--:--</span>;
	return (
		<time dateTime={value.iso}>
			{value.time} {value.offset}
		</time>
	);
}
