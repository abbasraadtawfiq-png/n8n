# Portfolio — Graphic Designer & 3D Artist

Personal portfolio built with **Next.js 16 (App Router) · React 19 · TypeScript (strict) · CSS Modules**, with a Git-based CMS (**Keystatic**, at `/keystatic`), GSAP (core, loaded on demand) for pointer/time-driven motion, Lenis smooth scrolling on fine pointers, CSS scroll-driven animations, and an on-request 3D viewer (`@google/model-viewer`). Composition and interaction patterns follow the reference studied in [`docs/reference-audit.md`](docs/reference-audit.md).

> **Status: implementation complete, preview only.** The site currently shows a placeholder identity, a placeholder portrait and six clearly-labelled **sample** projects. It is `noindex` everywhere and must not be launched until [`docs/content-needed.md`](docs/content-needed.md) is resolved and `pnpm check:launch` passes.

This directory is self-contained inside the repository (its own `pnpm-workspace.yaml` and lockfile) and does not touch the surrounding n8n code.

## Requirements

- Node.js ≥ 22.19 (tested on 22.22)
- pnpm 10 (`corepack enable` picks up the pinned `packageManager` version)

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install --frozen-lockfile` | Install exactly the locked dependencies |
| `pnpm dev` | Development server on http://localhost:3000 · CMS at http://localhost:3000/keystatic |
| `pnpm build` | Production build (static pages + the contact API) |
| `pnpm start` | Serve the production build (`--port` to change) |
| `pnpm lint` | ESLint (flat config, `eslint-config-next` + TypeScript rules) |
| `pnpm typecheck` | Generate route types and run `tsc --noEmit` |
| `pnpm test` | Vitest unit tests (contact handler, validation, content loader + CMS parity, SEO helpers) |
| `pnpm test:e2e` | Playwright against the production server (run `pnpm build` first). Locally: `pnpm test:e2e --project=chromium --project=mobile-chrome` |
| `pnpm content:check` | Validate content + asset files; regenerates `docs/asset-manifest.md` |
| `pnpm check:launch` | Fails until the site is genuinely launch-ready (placeholders, samples, origin, contact) |
| `pnpm audit:performance` | Lighthouse ×3 for Home + a project page, mobile & desktop, against `BASE_URL` (a running `pnpm start`) |
| `pnpm project:add <folder> --title "…" [--category 3d]` | Import a folder of images/videos/`.glb` models as a new draft project (resizes images, converts video, makes the share image) |
| `pnpm media:video <file> [out]` | Convert one video to web MP4 + WebM + poster (needs `ffmpeg`) |
| `pnpm media:normalize` | Rename media to the file names the CMS uses (after adding files by hand) |

Visual QA screenshots: `BASE_URL=http://localhost:3000 node scripts/screenshots.mjs docs/qa/screenshots`.

Single-file interactive preview (for hosts that cannot run Next.js, e.g. a shared Claude artifact): with a production server running, `BASE_URL=http://localhost:3000 node scripts/preview-artifact/build.mjs out/preview.html`. It snapshots every route, inlines CSS/fonts/media/models, and `scripts/preview-artifact/runtime.js` re-creates the interactions (curtain, intro, lightbox, before/after, 3D, filters). Lenis and the 3D viewer load from jsDelivr there; the contact form cannot send and the CMS is not included.

## Editing content

Run `pnpm dev` and open **http://localhost:3000/keystatic**. Edit your name, portrait, bio, contact details and projects (images, videos, before/after sliders, 3D models), then commit the changed files. For editing from the live site (each save becomes a commit and the host redeploys), see [`docs/cms.md`](docs/cms.md).

## Project structure

```
keystatic.config.ts    CMS schema (site identity + projects + gallery block types)
content/               CMS data: site.yaml, projects/<slug>/index.yaml
src/
  app/(site)/          Routes: / · /work · /work/[slug] · /about · /contact · /privacy
  app/keystatic, app/api/keystatic   CMS admin + API (dev, or GitHub mode in production)
  app/                 api/contact (POST), api/vitals (optional), sitemap, robots,
                       og-default.png (generated share image), icons, 404, error boundaries
  components/          UI components (server by default; 'use client' only where interactive)
  content/             load.ts (reads + validates content/, image sizes from files) · schema.ts (zod)
                       index.ts (getters) · strings.ts (UI copy)
  lib/                 config (origin/indexing) · seo · motion config · contact (handler, provider, rate limit)
  styles/              tokens.css (design tokens) · globals.css
  fonts/               Self-hosted OFL fonts + licences
public/media/          Images, video and .glb models managed by the CMS
scripts/               Content/launch checks, project import, video conversion, media normalizing,
                       Lighthouse, screenshots, single-file preview builder, sample generators
tests/unit, tests/e2e  Vitest and Playwright suites
docs/                  Audit, design system, content guide, QA report, deployment
```

## Documentation

- [`docs/reference-audit.md`](docs/reference-audit.md) — what could be inspected (the reference was blocked by network policy) and every approximation
- [`docs/design-system.md`](docs/design-system.md) — tokens, type scale, components, motion, responsive rules
- [`docs/cms.md`](docs/cms.md) — the CMS: local editing, importing work, online editing (GitHub mode)
- [`docs/content-guide.md`](docs/content-guide.md) — every identity/project field, media guidelines, SEO
- [`docs/content-needed.md`](docs/content-needed.md) — exactly what is still missing for launch
- [`docs/asset-manifest.md`](docs/asset-manifest.md) — generated list of every asset, provenance and usage
- [`docs/qa-report.md`](docs/qa-report.md) — commands run, real results, evidence paths
- [`docs/deployment.md`](docs/deployment.md) — environment, launch validation, hosting, rollback
