import { Fragment, type CSSProperties, type ReactNode } from 'react';

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'span';

interface Props {
	/** One string, or several lines rendered with line breaks between them. */
	text: string | readonly string[];
	as?: Tag;
	className?: string;
	id?: string;
	/** Rendered before the words (e.g. an avatar), outside the animation. */
	prefix?: ReactNode;
}

/**
 * Headline that reveals word by word, each word sliding up out of its own
 * mask (see "split" rules in globals.css; RevealController triggers it).
 * The words are real text in the HTML; without JavaScript they are simply
 * visible.
 */
export function SplitText({ text, as: Component = 'span', className, id, prefix }: Props) {
	const lines = typeof text === 'string' ? [text] : text;
	let i = 0;
	return (
		<Component className={className} id={id} data-reveal="split">
			{prefix}
			{lines.map((line, l) => {
				const words = line.split(/\s+/).filter(Boolean);
				return (
					<Fragment key={l}>
						{l > 0 && <br />}
						{words.map((word, w) => (
							<Fragment key={w}>
								<span className="split-mask">
									<span className="split-word" style={{ '--i': i++ } as CSSProperties}>
										{word}
									</span>
								</span>
								{w < words.length - 1 ? ' ' : ''}
							</Fragment>
						))}
					</Fragment>
				);
			})}
		</Component>
	);
}
