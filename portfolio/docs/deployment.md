# Deployment

Nothing has been deployed. No domain, DNS, hosting account or email provider was configured, and no real email was sent — those require your authorization.

## Runtime

| | |
| --- | --- |
| Framework | Next.js 16.3.8 (App Router, Turbopack build), React 19.3 |
| Node.js | ≥ 22.19 (verified on 22.22.0) |
| Package manager | pnpm 10.12.1 (pinned via `packageManager`; `portfolio/pnpm-lock.yaml` is the only lockfile) |
| Build | `pnpm install --frozen-lockfile && pnpm build` |
| Start (self-hosted) | `pnpm start --port 3000` |
| Rendering | All pages statically generated at build time; `/api/contact` and `/api/vitals` are server functions. **Not** a static export — the contact form needs a server. |

## Recommended host: Vercel

1. Import the GitHub repository; set **Root Directory** to `portfolio`. Framework preset: Next.js. Install command `pnpm install --frozen-lockfile`, build command `pnpm build` (defaults detect both).
2. Set environment variables (Production and Preview separately, see `.env.example`):
   - Preview: leave `SITE_URL`/`SITE_INDEXING` empty → every page `noindex`.
   - Production: `SITE_URL=https://yourdomain`, `SITE_INDEXING=allow` (only after content is real), `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
   - `CONTACT_IP_HEADER`: Vercel sets `x-forwarded-for` / `x-real-ip` for the client; keep the default and confirm on a preview deployment that a spoofed `x-forwarded-for` from the client does not change the rate-limit key.
3. Public values are read at build time: redeploy after changing them.
4. Add the domain in Vercel, then point DNS as Vercel instructs (your action).
5. Preview deployments are public URLs; enable Vercel Deployment Protection if previews must stay private (`noindex` is not access control).

Other hosts work if they run `next start` (Node) or support Next.js server functions (e.g. Netlify, Render, a VPS behind nginx). On a single VPS the in-memory rate limiter is adequate; make sure the proxy sets a trustworthy client-IP header and point `CONTACT_IP_HEADER` at it.

## Before going public

```bash
SITE_URL=https://yourdomain SITE_INDEXING=allow RESEND_API_KEY=… CONTACT_TO_EMAIL=… CONTACT_FROM_EMAIL=… \
  pnpm check:launch      # must exit 0
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

`check:launch` fails on: placeholder name/portrait/bio, any `sample` project or placeholder asset in use, missing/invalid/local `SITE_URL`, indexing not allowed, and no working contact route. (The e2e suite asserts preview behaviour such as `noindex`; update `tests/e2e/seo.spec.ts` expectations when you switch a build to indexable.)

## Verify on the deployed preview / production

- [ ] `curl -sI https://domain/` shows CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and — production only — `Strict-Transport-Security` and **no** `X-Robots-Tag`.
- [ ] `/_next/static/*` → `Cache-Control: public, max-age=31536000, immutable`; `/media/*` → `max-age=86400, stale-while-revalidate=604800`; HTML per host defaults.
- [ ] `/work/unknown` → HTTP 404; direct loads of `/work/<slug>` → 200.
- [ ] View source: canonical = `https://domain/…`, `og:image` absolute, JSON-LD present, `robots` = `index, follow`.
- [ ] `/sitemap.xml` lists only published pages; `/robots.txt` references it.
- [ ] Browser console: no CSP violations (the policy keeps `'unsafe-inline'` for Next's inline bootstrap scripts because pages are static; a nonce-based CSP would force dynamic rendering).
- [ ] Contact: send one message to an authorised test inbox; confirm the success message appears only after Resend accepts it, check the inbox (acceptance ≠ delivery), check SPF/DKIM pass, and that Reply-To is the visitor.
- [ ] Rate limit: 6 quick submissions from one connection → the 6th shows the "try again" message.
- [ ] HSTS: starts as `max-age=31536000` without `includeSubDomains`/`preload`; add those only once every subdomain is HTTPS.
- [ ] Real devices: iPhone Safari and an Android Chrome (menu, hero crop, safe areas, video autoplay, form keyboard).

## After launch

1. Google Search Console: verify the domain (DNS TXT), submit `https://domain/sitemap.xml`, URL-inspect Home, Work and two projects. No ranking or indexing timeline can be promised.
2. Optional field data: set `NEXT_PUBLIC_WEB_VITALS=true` to log anonymous LCP/INP/CLS beacons (one log line per metric; no identifiers). Judge Core Web Vitals on the 75th percentile once real traffic exists; mention it in the privacy page (already conditional).
3. Re-run `pnpm audit:performance` against production after replacing samples with real (heavier) media.

## Rollback

- Vercel: Deployments → pick the last good deployment → **Promote to Production** (instant, no rebuild). Previous deployments are kept automatically.
- Self-hosted: deploy from git tags (`git tag release-YYYYMMDD`), keep the previous `.next` build directory, switch the process back and restart.
- Content mistakes: revert the commit touching `src/content/` or `public/media/` and redeploy.
