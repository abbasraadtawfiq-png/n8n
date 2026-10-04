import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isCmsEnabled } from '@/lib/cms';
import KeystaticApp from './keystatic';

export const metadata: Metadata = { title: 'Portfolio CMS', robots: { index: false, follow: false } };

export default function KeystaticLayout() {
	if (!isCmsEnabled()) notFound();
	return <KeystaticApp />;
}
