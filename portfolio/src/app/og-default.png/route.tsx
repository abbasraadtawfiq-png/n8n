import { ImageResponse } from 'next/og';
import { site } from '@/content';

export const dynamic = 'force-static';

/** Default 1200×630 sharing image, generated at build time from site identity. */
export function GET() {
	return new ImageResponse(
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '72px 80px',
				background: '#1c1d20',
				color: '#ffffff',
			}}
		>
			<div style={{ display: 'flex', fontSize: 28, color: '#9a9b9f' }}>
				{site.location.city}, {site.location.country}
			</div>
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<div style={{ fontSize: 120, letterSpacing: -4, lineHeight: 1 }}>{site.name}</div>
				<div style={{ display: 'flex', alignItems: 'center', marginTop: 36, fontSize: 40 }}>
					<div style={{ width: 28, height: 28, borderRadius: 14, background: '#455ce9', marginRight: 20 }} />
					{site.role}
				</div>
			</div>
		</div>,
		{ width: 1200, height: 630 },
	);
}
