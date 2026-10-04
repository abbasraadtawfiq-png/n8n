# Portfolio — Graphic Designer & 3D Artist

Personal portfolio built with **Next.js 16 (App Router) · React 19 · TypeScript (strict) · CSS Modules**, with GSAP (core, loaded on demand) for pointer/time-driven motion and CSS scroll-driven animations for scroll-linked effects. Composition and interaction patterns follow the reference studied in [`docs/reference-audit.md`](docs/reference-audit.md).

> **Status: implementation complete, preview only.** The site currently shows a placeholder identity, a placeholder portrait and six clearly-labelled **sample** projects. It is `noindex` everywhere and must not be launched until [`docs/content-needed.md`](docs/content-needed.md) is resolved and `pnpm check:launch` passes.

This directory is self-contained inside the repository (its own `pnpm-workspace.yaml` and lockfile) and does not touch the surrounding n8n code.

## Requirements

- Node.js ≥ 22.19 (tested on 22.22)
- pnpm 10 (`corepack enable` picks up the pinned `packageManager` version)

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install --frozen-lockfile` | Install exactly the locked dependencies |
| `pnpm dev` | Development server on http://localhost:3000 |
| `pnpm build` | Production build (static pages + the contact API) |
| `pnpm start` | Serve the production build (`--port` to change) |
| `pnpm lint` | ESLint (flat config, `eslint-config-next` + TypeScript rules) |
| `pnpm typecheck` | Generate route types and run `tsc --noEmit` |
| `pnpm test` | Vitest unit tests (contact handler, validation, SEO helpers) |
| `pnpm test:e2e` | Playwright against the production server (run `pnpm build` first). Locally: `pnpm test:e2e --project=chromium --project=mobile-chrome` |
| `pnpm content:check` | Validate content + asset files; regenerates `docs/asset-manifest.md` |
| `pnpm check:launch` | Fails until the site is genuinely launch-ready (placeholders, samples, origin, contact) |
| `pnpm audit:performance` | Lighthouse ×3 for Home + a project page, mobile & desktop, against `BASE_URL` (a running `pnpm start`) |
| `pnpm assets:placeholders` | Regenerate the sample artwork (only needed if you change the samples) |

Visual QA screenshots: `BASE_URL=http://localhost:3000 node scripts/screenshots.mjs docs/qa/screenshots`.

## Project structure

```
src/
  app/                 Routes: / · /work · /work/[slug] · /about · /contact · /privacy
                       api/contact (POST), api/vitals (optional), sitemap, robots,
                       og-default.png (generated share image), icons, 404, error boundaries
  components/          UI components (server by default; 'use client' only where interactive)
  content/             site.ts (identity) · projects.ts · assets.ts (manifest) · strings.ts (UI copy)
                       schema.ts + validate.ts (zod validation, fails the build on bad content)
  lib/                 config (origin/indexing) · seo · motion config · contact (handler, provider, rate limit)
  styles/              tokens.css (design tokens) · globals.css
  fonts/               Self-hosted OFL fonts + licences
public/media/          Runtime images/video referenced by the asset manifest
scripts/               Content/launch checks, placeholder generator, Lighthouse, screenshots
tests/unit, tests/e2e  Vitest and Playwright suites
docs/                  Audit, design system, content guide, QA report, deployment
```

## Documentation

- [`docs/reference-audit.md`](docs/reference-audit.md) — what could be inspected (the reference was blocked by network policy) and every approximation
- [`docs/design-system.md`](docs/design-system.md) — tokens, type scale, components, motion, responsive rules
- [`docs/content-guide.md`](docs/content-guide.md) — change identity/portrait/contact, add projects, replace media, SEO
- [`docs/content-needed.md`](docs/content-needed.md) — exactly what is still missing for launch
- [`docs/asset-manifest.md`](docs/asset-manifest.md) — generated list of every asset, provenance and usage
- [`docs/qa-report.md`](docs/qa-report.md) — commands run, real results, evidence paths
- [`docs/deployment.md`](docs/deployment.md) — environment, launch validation, hosting, rollback
