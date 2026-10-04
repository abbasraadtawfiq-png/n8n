import type { Metadata } from 'next';
import { MagneticLink } from '@/components/MagneticButton';
import { SiteFooter } from '@/components/SiteFooter';
import { SplitText } from '@/components/SplitText';
import { strings } from '@/content/strings';
import shell from './shell.module.css';

export const metadata: Metadata = {
	title: strings.notFound.title,
	robots: { index: false, follow: true },
};

export default function NotFound() {
	return (
		<>
			<main id="main" tabIndex={-1} className={`${shell.page} container`} data-menu-inert="">
				<p className="label">404</p>
				<SplitText as="h1" className={shell.headline} text={strings.notFound.title} />
				<p className={shell.lede}>{strings.notFound.body}</p>
				<div className={shell.actions}>
					<MagneticLink href="/" variant="dark" shape="pill">
						{strings.notFound.home}
					</MagneticLink>
					<MagneticLink href="/work" variant="outline" shape="pill">
						{strings.nav.work}
					</MagneticLink>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}
