'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import type { Category } from '@/content/schema';
import type { ProjectSummary } from '@/content/summary';
import { strings } from '@/content/strings';
import { GridIcon, ListIcon } from './Icons';
import { ProjectCard } from './ProjectCard';
import { ProjectList } from './ProjectList';
import styles from './WorkIndex.module.css';

interface Props {
	projects: ProjectSummary[];
	categories: { category: Category; label: string; count: number }[];
}

type View = 'list' | 'grid';

/**
 * Category filter + list/grid toggle. State lives in the URL
 * (?category=3d&view=grid) so it survives reload and back/forward. Without
 * JavaScript every project is still listed.
 */
export function WorkIndex(props: Props) {
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const requested = params.get('category');
	const category = props.categories.some((c) => c.category === requested) ? (requested as Category) : null;
	const view: View = params.get('view') === 'grid' ? 'grid' : 'list';

	// Results only animate after the visitor changes something, not on first load.
	const [interacted, setInteracted] = useState(false);

	const update = (next: { category?: Category | null; view?: View }) => {
		setInteracted(true);
		const search = new URLSearchParams(params.toString());
		const c = next.category === undefined ? category : next.category;
		const v = next.view ?? view;
		if (c) search.set('category', c);
		else search.delete('category');
		if (v === 'grid') search.set('view', 'grid');
		else search.delete('view');
		const query = search.toString();
		router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
	};

	return <WorkIndexView {...props} category={category} view={view} onChange={update} animate={interacted} />;
}

/** Stateless rendering, also used as the static fallback before hydration. */
export function WorkIndexView({
	projects,
	categories,
	category,
	view,
	onChange,
	animate = false,
}: Props & {
	animate?: boolean;
	category: Category | null;
	view: View;
	onChange?: (next: { category?: Category | null; view?: View }) => void;
}) {
	const visible = category ? projects.filter((p) => p.category === category) : projects;
	// Filters are only useful with at least two non-empty categories.
	const showFilters = categories.length > 1;

	return (
		<div>
			<div className={styles.controls}>
				{showFilters ? (
					<div role="group" aria-label={strings.work.filterLabel} className={styles.filters}>
						<FilterButton
							active={!category}
							count={projects.length}
							onClick={() => onChange?.({ category: null })}
						>
							{strings.work.all}
						</FilterButton>
						{categories.map((c) => (
							<FilterButton
								key={c.category}
								active={category === c.category}
								count={c.count}
								onClick={() => onChange?.({ category: c.category })}
							>
								{c.label}
							</FilterButton>
						))}
					</div>
				) : (
					<span />
				)}
				<div role="group" aria-label={strings.work.viewLabel} className={styles.views}>
					<button
						type="button"
						aria-pressed={view === 'list'}
						aria-label={strings.work.listView}
						onClick={() => onChange?.({ view: 'list' })}
					>
						<ListIcon width={20} height={20} />
					</button>
					<button
						type="button"
						aria-pressed={view === 'grid'}
						aria-label={strings.work.gridView}
						onClick={() => onChange?.({ view: 'grid' })}
					>
						<GridIcon width={20} height={20} />
					</button>
				</div>
			</div>

			<p className="visually-hidden" role="status">
				{strings.work.count(visible.length)}
			</p>

			{/* Re-keyed on every filter/view change so the results animate in (CSS only). */}
			<div
				key={`${view}-${category ?? 'all'}`}
				className={styles.results}
				data-animate={animate || undefined}
			>
				{visible.length === 0 ? (
					<div className={styles.empty}>
						<p>{strings.work.empty}</p>
						<button type="button" onClick={() => onChange?.({ category: null })}>
							{strings.work.showAll}
						</button>
					</div>
				) : view === 'grid' ? (
					<ul className={styles.grid}>
						{visible.map((p, i) => (
							<li key={p.slug} data-category={p.category} style={{ '--i': i } as CSSProperties}>
								<ProjectCard project={p} />
							</li>
						))}
					</ul>
				) : (
					<ProjectList projects={visible} showHeader titleTag="h2" />
				)}
			</div>
		</div>
	);
}

function FilterButton({
	active,
	count,
	onClick,
	children,
}: {
	active: boolean;
	count: number;
	onClick: () => void;
	children: string;
}) {
	return (
		<button type="button" className={styles.filter} aria-pressed={active} onClick={onClick}>
			{children}
			<sup>{count}</sup>
		</button>
	);
}
