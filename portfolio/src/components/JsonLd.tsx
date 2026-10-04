import { serializeJsonLd } from '@/lib/seo';

/** Renders structured data; renders nothing when there is none to publish. */
export function JsonLd({ data }: { data: object | object[] | null }) {
	if (!data) return null;
	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
