# Content guide

All copy and media are edited in the CMS at **`/keystatic`** (run `pnpm dev`, then open http://localhost:3000/keystatic). How the CMS works, where files are stored and how to edit from the live site: [`cms.md`](cms.md). Components never contain your copy.

After editing, run `pnpm content:check`. It validates the data and the files (existence, dimensions, alt text, https links, time zone) and rewrites `docs/asset-manifest.md`. A build fails loudly on invalid content.

## 1. Identity: CMS → *Site identity*

| Field | Notes |
| --- | --- |
| Full name | Replace "Your Name". Used in the `<h1>`, marquee, titles, footer and share image. |
| Short name | Header wordmark ("© Design by …"), e.g. your first name. |
| Role, hero role lines | Already "Graphic Designer & 3D Artist"; the two lines control how the hero breaks. |
| City, country, time zone | The footer clock uses the IANA time zone (e.g. `Asia/Baghdad`). |
| Email, phone | Empty hides them. When set they become real `mailto:`/`tel:` links in the footer and on Contact. |
| Availability | Optional line; empty hides it. |
| Social profiles | Label + https URL; shown in the footer, menu and Contact. |
| Portrait | Cut-out (transparent PNG/WebP) or on a gray close to `#737679`, at least **1600 × 2000 px**, subject touching the bottom edge. Hero, About and the avatars switch automatically, and the hero image becomes the preloaded LCP image. |
| Statement, intro, bio, services | Your copy. Remove the placeholder sentence from the bio (the launch check looks for it). |
| Footer year, default description | Description ≤ 170 characters. |

## 2. Add a project

**Fastest:** `pnpm project:add <folder> --title "Name" --category 3d`. This imports images, videos and `.glb` models as a draft (details in [`cms.md`](cms.md)); then finish it in the CMS.

**In the CMS:** *Projects → Add*:

- **Title / URL slug**: the slug becomes `/work/<slug>`. Don't rename it after launch.
- **Status**: *Published* for real work, *Draft* to hide, *Sample* only for preview placeholders.
- **Category**: Graphic Design, 3D or Art Direction. Filters appear only for categories that have projects.
- **Show on the home page**: the first 6 featured projects by *Display order* appear there.
- **Cover** + alt text + **thumbnail focus** (the % crop centre for list and grid thumbnails).
- **Gallery blocks**: Image, Video, Before/after, 3D model, each Full or Half width.
- **Client, year, location, credits, tools, verified results, external link**: fill only what is true and approved; empty fields are not shown.
- **SEO title / description**: unique per project. The **social image** is optional (1200 × 630); the cover is used otherwise.
- **Media source / permission note**: record that you own the work or the client approved public use.

Before launch, delete the six sample projects (CMS → Projects → each sample → Delete), then run `pnpm content:check`. It warns about any media file that is no longer used, so you can remove leftovers.

## 3. Media guidelines

| Kind | Format | Notes |
| --- | --- | --- |
| Images | JPG/WebP/PNG, ~2400 px wide | Next.js serves resized AVIF/WebP automatically. They are never cropped on the project page. |
| Video | MP4 (H.264) + WebM, poster JPG | Use `pnpm media:video` or `project:add` to produce all three. Silent loops are best under ~8 MB. |
| Before/after | Two images of identical size | The check fails if their aspect ratios differ. |
| 3D | `.glb` (binary glTF), ideally < 10 MB, Draco/meshopt compressed | Plus a poster render. Loaded only on request. |

When replacing published media, prefer new file names so browsers and CDNs don't keep the old file (media is cached for a day).

## 4. Interface text

UI strings (navigation, buttons, form questions, errors, the intro words) are in `src/content/strings.ts`. The site is English-only by decision; the Arabic font fallback still renders correctly if an Arabic name or word is entered.

## 5. SEO

Titles and descriptions come from *Site identity* and each project's SEO fields. Indexing turns on only when **all** of these are true:

- `SITE_URL` is a real https origin.
- `SITE_INDEXING=allow`.
- The name is not the placeholder.
- No sample projects remain.

Structured data (Person/ProfilePage, CreativeWork, BreadcrumbList) is emitted automatically under the same conditions, using only confirmed fields.
