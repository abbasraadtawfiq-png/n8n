import type { Metadata } from 'next';
import Link from 'next/link';
import { PageTransition } from '@/components/PageTransition';
import { SiteFooter } from '@/components/SiteFooter';
import { site } from '@/content';
import { isContactConfigured } from '@/lib/contact/config';
import { webVitalsEnabled } from '@/lib/config';
import { pageMetadata } from '@/lib/seo';
import shell from '../shell.module.css';

export const metadata: Metadata = pageMetadata({
	title: 'Privacy',
	description: 'How this portfolio handles the information you send through it.',
	path: '/privacy',
});

/** Factual description of what this site actually does with personal data. */
export default function PrivacyPage() {
	const configured = isContactConfigured();
	return (
		<PageTransition>
			<main id="main" tabIndex={-1} className={`${shell.page} container`} data-menu-inert="">
				<h1 className={shell.headline}>Privacy</h1>
				<div className={shell.prose}>
					<p>
						This is a personal portfolio. It does not use analytics, advertising, tracking cookies or user
						accounts.
					</p>

					<h2>Contact form</h2>
					<p>
						When you send the <Link href="/contact">contact form</Link>, the name, email address, optional
						organization and budget, and message you enter are used only to reply to your inquiry.
					</p>
					{configured ? (
						<p>
							The message is passed to the email delivery service Resend, which delivers it to {site.name}’s
							inbox. This site does not store the message in a database.
						</p>
					) : (
						<p>
							The form is not connected to an email service in this build, so submitted messages are not sent
							or stored.
						</p>
					)}
					<p>
						To limit abuse, the server briefly counts requests per network address. That count expires
						automatically after a few minutes and is not linked to your message.
					</p>

					<h2>Hosting</h2>
					<p>
						The hosting provider may keep standard technical request logs (such as IP address and time) for
						security and operations.
					</p>

					<h2>Stored on your device</h2>
					<p>
						If you use the “Pause motion” control, that choice is remembered in your browser’s local storage.
						Nothing else is stored.
					</p>

					{webVitalsEnabled && (
						<>
							<h2>Performance measurements</h2>
							<p>
								Anonymous page-speed measurements (metric name, value and page path, without identifiers) are
								collected to keep the site fast.
							</p>
						</>
					)}

					<h2>Questions</h2>
					<p>
						{site.email ? (
							<>
								Write to <a href={`mailto:${site.email}`}>{site.email}</a> to ask about or delete anything you
								sent.
							</>
						) : (
							<>Use the contact details on this site to ask about or delete anything you sent.</>
						)}
					</p>
				</div>
			</main>
			<SiteFooter />
		</PageTransition>
	);
}
