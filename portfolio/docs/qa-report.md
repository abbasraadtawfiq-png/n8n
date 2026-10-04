# QA report

**Date:** 2026-10-04 (updated after the CMS and motion/media features) · **Environment:** cloud Linux container, Node 22.22.0, pnpm 10.12.1, Playwright 1.56.1 with Chromium build 1194 (headless), Lighthouse 13.5.0 · **Build:** Next.js 16.3.8 production build (`pnpm build`, served by `pnpm start`), repo base commit `f30cc7b`.

Status legend: **PASS** run here and passed · **FAIL** run here and failed · **NOT RUN** not possible here (reason given) · **PENDING** needs external setup.

## Static and build checks

| Command | Expected | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| `pnpm install --frozen-lockfile` | Installs from lockfile | Installed (pnpm 10.12.1) | PASS | `pnpm-lock.yaml` |
| `pnpm content:check` | 0 errors | 6 projects, 35 media files, 0 errors, 0 warnings | PASS | `docs/asset-manifest.md` |
| `pnpm check:launch` | Fails while preview | 9 errors (placeholder name/portrait/bio, 6 samples, no published projects, placeholder assets, no `SITE_URL`, indexing off, no contact route) | PASS (fails as designed) | console |
| `pnpm lint` | 0 problems | 0 errors, 0 warnings | PASS | — |
| `pnpm typecheck` | 0 errors | 0 errors | PASS | — |
| `pnpm test` (Vitest) | All pass | 33 / 33 passed (contact handler incl. mocked provider acceptance/failure, origin, size, honeypot, rate limit, fail-closed limiter, no message logging; Resend payload; client/server validation parity; CMS content loader incl. parity with Keystatic's own reader and error fixtures; SEO helpers) | PASS | `docs/qa/unit-results.txt` |
| `pnpm build` | Success | 20 static routes + server functions (contact, vitals, CMS) | PASS | — |
| Route status (`curl`) | 200 / real 404 | `/ /work /work/<slug> /about /contact /privacy /robots.txt /sitemap.xml /og-default.png` → 200; `/work/does-not-exist` → **404**; `GET /api/contact` → 405 | PASS | `docs/qa/headers.txt` |
| Response headers | Security + cache headers | CSP, nosniff, Referrer-Policy, X-Frame-Options DENY, COOP, Permissions-Policy, `X-Robots-Tag: noindex` (preview); chunks `immutable`; media `max-age=86400, swr` | PASS (local `next start` only) | `docs/qa/headers.txt` |
| `pnpm audit --prod` | No known vulns | No known vulnerabilities | PASS | — |
| `pnpm audit` (incl. dev) | — | 1 high: `braces` ReDoS via `eslint-config-next → fast-glob → micromatch` (lint-time only, repo-controlled patterns, no patched release) | Accepted, documented | — |

## End-to-end (Playwright, production server)

`pnpm test:e2e --project=chromium --project=mobile-chrome` → **92 passed, 0 failed, 8 skipped** (skips are viewport-specific tests by design, e.g. desktop-only hover or the 3D viewer test on the mobile project). Evidence: `docs/qa/e2e-results.txt`.

| # | Scenario | Result |
| --- | --- | --- |
| 1 | Home usable while all project images are held back | PASS |
| 2 | Header nav (desktop), one `<h1>` per page, skip link | PASS |
| 3 | Menu: keyboard open, focus moves in, focus contained, Escape, focus returns to trigger, `inert` lifted, scroll unlocked, closed drawer inert; rapid toggling; navigation closes it (desktop floating trigger and mobile "Menu") | PASS |
| 4 | Filters: counts, URL state, reload, back restores filter, cards open correct project, grid toggle | PASS |
| 5 | Detail reload, Next case, wrap-around, All work, back/forward, modified-click new tab | PASS |
| 6 | Unknown slug → HTTP 404 with noindex | PASS |
| 7 | Contact: inline errors with `aria-invalid` + described-by + focus; pending state; duplicate activation ignored; mocked acceptance → success; provider failure → retry → success; network failure; rate-limit message; real endpoint without credentials → "Not sent" | PASS |
| 7b | API: cross-origin 403, non-JSON 415, invalid 400, unconfigured 503, 429 + `Retry-After` | PASS |
| 8 | Marquee moves; Pause control stops it; reduced motion stops it, hides the control and shows reveal content | PASS |
| 9 | Fine pointer shows preview + "View" cursor, clears on leave; touch shows inline thumbnails and no hover UI | PASS |
| 10 | No horizontal overflow at 320/360/390/430/768/1024/1440/1920 px on 5 routes | PASS |
| 11 | Every page `noindex` (meta + header), unique titles/descriptions, no canonical/OG/JSON-LD invented without `SITE_URL`, sitemap excludes samples, robots allows crawling | PASS |
| 12 | No secret names, Resend endpoint or key-shaped strings in HTML/JS | PASS |
| 13 | Axe (WCAG 2.0/2.1/2.2 A+AA tags): zero serious/critical on 7 routes, desktop and mobile | PASS |
| 14 | JavaScript disabled: hero, statement, full project list, project navigation, About content | PASS |
| 15 | Page curtain: covers with the destination name, navigates, lifts; skipped for modified clicks, same page and reduced motion | PASS |
| 16 | Intro preloader: plays once per tab session, never with reduced motion, absent without JS | PASS |
| 17 | Headline word reveal ends visible; words are plain text in the HTML | PASS |
| 18 | Lightbox: open, arrow keys, Escape, focus return; images are real links without JS | PASS |
| 19 | Before/after slider operable by keyboard with announced value | PASS |
| 20 | 3D model: nothing 3D is downloaded until "View in 3D"; then the viewer loads and shows the model (desktop Chromium) | PASS |
| 21 | Work filter results re-render and animate in (only after interaction) | PASS |
| 22 | `/keystatic` and `/api/keystatic/*` return 404 on a production server without GitHub mode | PASS |
| — | Firefox, WebKit desktop, iPhone (WebKit) projects | **NOT RUN** — browser binaries are not installed in this container and the environment prohibits `playwright install`. Configured in `playwright.config.ts`; the CI workflow installs and runs them. |

Issues found by the suite and fixed: the no-JS work list stalled behind its entrance animation (animation now runs only after interaction); earlier,  preview card stuck at zero scale (GSAP absorbed the CSS `scale`), focus not returned after Escape (visibility check used `offsetParent`, always `null` for fixed elements), "Pause motion" text contrast (opacity 0.85), horizontal overflow from the footer curve, clipped active-dot in the mobile drawer.

## Performance (Lighthouse 13.5.0, production server, median of 3)

Mobile = Lighthouse default (simulated slow 4G, 4× CPU, Moto G Power viewport). Desktop = Lighthouse desktop preset. Local server on the same machine (no CDN, cold cache per run). Reports: `docs/qa/lighthouse/*.html|json`, medians in `docs/qa/lighthouse/summary.json`.

| Page | Form factor | Perf | A11y | Best Pr. | SEO | LCP | TBT | CLS | FCP | Transfer | Script (gz) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | mobile | **94** | 100 | 100 | 66* | 2.68 s | 92 ms | 0.002 | 0.92 s | 318 KB | 222 KB† |
| `/work/soft-matter` | mobile | **96** | 100 | 100 | 66* | 2.01 s | 152 ms | 0.002 | 0.92 s | 304 KB | 206 KB |
| `/` | desktop | **98** | 100 | 100 | 66* | 0.58 s | 0 ms | 0.003 | 0.26 s | 311 KB | 222 KB† |
| `/work/soft-matter` | desktop | **98** | 100 | 100 | 66* | 0.59 s | 0 ms | 0.003 | 0.26 s | 302 KB | 206 KB |

Run-to-run variance is large for simulated mobile LCP: Home 2.74 / 2.05 / 2.68 s, project 1.98 / 2.01 / 2.65 s (performance 91–97). These numbers are after adding the CMS, intro, curtain, Lenis, lightbox, before/after and the 3D viewer. Compared with the earlier build (98/97 mobile, LCP 2.45/2.49 s), total script transfer on Home rose from 215 to 222 KB gz. Lenis and the 3D viewer (≈ 1 MB) are not in the initial load: Lenis loads after hydration on fine pointers only, and the viewer only on request.

\* SEO 66 is caused only by the `is-crawlable` audit, i.e. the intentional preview `noindex`. All other SEO audits pass. It cannot be re-measured as indexable until real identity/content exist.
† Whole page lifetime as Lighthouse counts it. Breakdown for mobile Home (run 1 network log): **≈ 161 KB gz initial-route JavaScript** (requested in the first ~75 ms; React DOM chunk alone 72.5 KB), **27.6 KB GSAP** requested after hydration (~175 ms), and **≈ 27 KB** of Next.js prefetches for routes linked on the page (~240 ms).

Bottlenecks fixed (before → after, mobile Home): zod and all content data were bundled into every page via the header/menu (−87 KB gz), the disabled Web Vitals chunk loaded anyway (−15 KB), ScrollTrigger replaced by CSS scroll-driven animations (≈ −17 KB, estimated), GSAP moved off the critical path. Script transfer 308 → 215 KB total (≈ 161 KB initial-route), Best Practices 96 → 100 (zod's `new Function` probe also triggered a CSP report), LCP 2.77 → 2.45 s.

Remaining notes: mobile Home's median LCP (2.68 s) is slightly over the 2.5 s lab target in this simulated run, while the project page is under it; the observed (unthrottled) LCP is ~0.1 s and the LCP element is the hero name text, so the simulated figure is dominated by script download estimates. Real portraits/project media will change these numbers — re-run after content lands. **Field Core Web Vitals (INP, p75 LCP/CLS) do not exist yet**; there is no traffic. Optional collection is ready (`NEXT_PUBLIC_WEB_VITALS`).

## Visual QA

Screenshots (desktop 1440×900, mobile Pixel 7) for every route, full pages, menu open and work-row hover: `docs/qa/screenshots/`. Captured with `scripts/screenshots.mjs`; the run reports no console errors, page errors or failed requests other than expected media range cancellations.

Manually reviewed: hero layering (portrait placeholder, marquee, hanger, role), intro/CTA rhythm, work rows and hover preview, sliding rows, footer curve and CTA on the hairline, menu drawer, Work filters/list/grid, project header/meta/gallery/next case, About split + services, dark Contact form, 404, mobile compositions.

**Reference comparison could not be done side by side**: the reference site was blocked by the network policy (see `reference-audit.md`), so fidelity is to recalled composition and behaviour, not measured pixels.

## Content management (Keystatic)

| Check | Result |
| --- | --- |
| Dev: open `/keystatic`, edit a project field, save → YAML on disk updated, site reflects it | PASS (Playwright-driven, then reverted) |
| Saving in the CMS does not rename existing media (after `pnpm media:normalize`) | PASS |
| Content loader output equals Keystatic's own `createReader` for every entry | PASS (unit test) |
| Production, local mode: `/keystatic` and `/api/keystatic/tree` → 404 | PASS |
| Production, GitHub mode with dummy credentials: admin renders "Log in with GitHub" under its own CSP | PASS (no real GitHub App or sign-in tested; needs your account) |

## Single-file preview (Claude artifact)

Built with `scripts/preview-artifact/build.mjs` and tested in headless Chromium via `file://`. jsDelivr is blocked in this container, so Lenis and model-viewer were served from the identical `node_modules` files during the test. Checks: intro plays once; curtain on navigation; filters + grid/list; before/after keyboard; 3D model reaches `ready`; lightbox open/step/close with focus return; video plays; no horizontal overflow on mobile routes; mobile menu navigation; **0 console/page errors**. One bug found and fixed (the hidden grid view rendered under the list).

## Accessibility (manual)

- Keyboard: skip link, header, menu (Tab containment, Escape, focus return), filters (`aria-pressed`), view toggles, gallery video control, form — all operable; focus ring visible on light and dark surfaces.
- Accessibility tree checked via Playwright role queries (headings, landmarks, button names, accessible descriptions on errors).
- Screen reader testing (VoiceOver/NVDA/TalkBack): **NOT RUN** — no screen reader available in this environment.
- Zoom/text enlargement: layouts use rem/clamp and wrap; no fixed-height text containers except the hero (min-height guarded). Spot-checked only.

## Security / configuration

- Contact handler: origin allow-list (self + `SITE_URL`), JSON only, 16 KB cap, strict schema (unknown fields rejected), CR/LF blocked in single-line fields, honeypot, rate limit before parsing, fail-closed limiter, fixed recipient/sender with visitor as Reply-To, plain-text body, no body logging. Success only on provider acceptance (unit-tested with mocks). **Live sending not tested** (no credentials, no authorization).
- Secrets read server-side only (`server-only` guard); none in `.env.example`.
- CSP verified in Chromium: no violations after the zod fix. Not verified on a deployed host.
- HTTPS/HSTS: **PENDING** — no production host.
