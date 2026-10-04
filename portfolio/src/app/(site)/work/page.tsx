import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FooterCurve } from '@/components/FooterCurve';
import { SiteFooter } from '@/components/SiteFooter';
import { SplitText } from '@/components/SplitText';
import { WorkIndex, WorkIndexView } from '@/components/WorkIndex';
import { CATEGORY_LABELS, getCategoryCounts, getProjects } from '@/content';
import { strings } from '@/content/strings';
import { toSummary } from '@/content/summary';
import { defaultOgImage, pageMetadata } from '@/lib/seo';
import shell from '../shell.module.css';

export function generateMetadata(): Metadata {
	return pageMetadata({
		title: 'Work',
		description: 'Selected graphic design, 3D art and art direction projects.',
		path: '/work',
		image: defaultOgImage(),
	});
}

export default function WorkPage() {
	const summaries = getProjects().map(toSummary);
	const categories = getCategoryCounts().map((c) => ({ ...c, label: CATEGORY_LABELS[c.category] }));

	return (
		<>
			<main id="main" tabIndex={-1} className={`${shell.page} container`} data-menu-inert="">
				<SplitText as="h1" className={shell.headline} text={strings.work.headline} />
				{/* The static fallback lists everything; the client version applies ?category & ?view. */}
				<Suspense
					fallback={
						<WorkIndexView projects={summaries} categories={categories} category={null} view="list" />
					}
				>
					<WorkIndex projects={summaries} categories={categories} />
				</Suspense>
			</main>
			<FooterCurve />
			<SiteFooter />
		</>
	);
}
