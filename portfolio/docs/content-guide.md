# Content guide

Everything editable lives in `src/content/`. Components never contain your copy. Run `pnpm content:check` after every change — it validates the data, checks image files and dimensions, and rewrites `docs/asset-manifest.md`. A build fails loudly on invalid content.

## 1. Name, role, bio, contact — `src/content/site.ts`

| Field | Notes |
| --- | --- |
| `name` | Replace `PLACEHOLDER_NAME` with your real name (string). Used in the `<h1>`, marquee, titles, footer, share image. |
| `shortName` | Shown in the header wordmark ("© Design by …"), e.g. your first name. |
| `role`, `roleLines` | Already "Graphic Designer & 3D Artist"; `roleLines` is how it breaks in the hero. |
| `location` | City, country and IANA time zone (footer clock). |
| `email`, `phone` | `null` hides them. When set they become real `mailto:`/`tel:` links in the footer and on Contact. |
| `availability` | Reserved; not shown until you decide how it should read. |
| `socialProfiles` | `[{ label: 'Instagram', href: 'https://…' }]` — https only, shown in footer, menu and Contact. |
| `statement`, `intro`, `bio`, `services` | Your copy. Remove the placeholder sentence from `bio` (the launch check looks for it). |
| `edition` | Year shown in the footer. |
| `seo.description` | Default meta description (≤ 170 chars). |

Arabic text is supported anywhere: the Arabic font loads automatically when Arabic characters appear.

## 2. Portrait

1. Export a cut-out portrait (transparent PNG or WebP, or a photo on a gray close to `#737679`), at least **1600 × 2000 px**, subject centred and touching the bottom edge.
2. Save it as `public/media/portrait/portrait.webp` (keep the master PSD elsewhere — not in `public/`).
3. Add it to `src/content/assets.ts`:
   ```ts
   portrait: { src: '/media/portrait/portrait.webp', type: 'image', mime: 'image/webp', width: 1600, height: 2000,
     alt: '', source: 'owner-supplied', permission: 'Owned by me' },
   ```
4. Set `portrait: 'portrait'` in `site.ts`. Hero, About and the footer/contact avatar switch automatically and the hero image becomes the preloaded LCP image.

## 3. Add a project

1. Create `public/media/projects/<slug>/` and add:
   - `cover.jpg` (or `.webp`) — any aspect ratio; ~2400 px wide is plenty.
   - `social.jpg` — exactly **1200 × 630** (share image).
   - gallery files in their **original aspect ratios** (they are never cropped on the detail page).
   - optional video: `loop.mp4` (H.264) + `loop.webm` (VP9/AV1) + `loop-poster.jpg`.
2. Register each file in `src/content/assets.ts` with its real `width`/`height`, meaningful `alt` text, `source: 'owner-supplied'` and a `permission` note (e.g. "Client approved public use, 2026"). For videos add `alternates` and `poster`.
3. Add an entry to `src/content/projects.ts` (copy an existing one):
   - `slug` — lowercase-hyphenated; becomes `/work/<slug>`. Don't rename after launch (or add a redirect).
   - `publishStatus: 'published'` for real work (`'draft'` hides it entirely).
   - `category` — `graphic-design`, `3d` or `art-direction`. Filters only appear for categories that have projects.
   - `featured: true` puts it on the home page (first 6 by `displayOrder`).
   - `client`, `year`, `location`, `credits`, `tools`, `verifiedResults`, `externalLink` — fill only what is true and approved; empty fields are simply not shown.
   - `cover.focalPoint` — percentage crop centre for thumbnails.
   - `media[]` — `layout: 'half'` pairs two items side by side; videos take `purpose: 'decorative'` (silent loop) or `'meaningful'` (controls, no autoplay — add captions/transcript if there is speech).
   - `seoTitle`, `seoDescription` — unique per project.
4. Delete the sample projects and their `public/media/projects/<sample>/` folders and asset entries.
5. `pnpm content:check && pnpm build`.

## 4. Replace media without changing layouts

Overwrite the file **and update its `width`/`height` in `assets.ts`** (the check fails on mismatches). Prefer new filenames when replacing published media so browsers and CDNs don't keep the old file (media is cached for a day).

## 5. Interface text

All UI strings (navigation, buttons, form questions, errors) are in `src/content/strings.ts` — change wording there. To add Arabic later, add a second dictionary with the same shape and route-level `lang`/`dir`; nothing in components needs rewriting.

## 6. SEO

Titles and descriptions come from `site.ts` and each project's `seoTitle`/`seoDescription`. Indexing turns on only when **all** are true: `SITE_URL` is a real https origin, `SITE_INDEXING=allow`, the name is not the placeholder, and no `sample` projects remain. Structured data (Person/ProfilePage, CreativeWork, BreadcrumbList) is emitted automatically under the same conditions, using only confirmed fields.
