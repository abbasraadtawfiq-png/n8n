# Content management (CMS)

The site uses **[Keystatic](https://keystatic.com)**, a Git-based CMS. There is no database: every edit is a change to files in this repository.

| What | Where it is stored |
| --- | --- |
| Name, role, bio, contact, socials, portrait, services, SEO defaults | `content/site.yaml` |
| Each project | `content/projects/<slug>/index.yaml` |
| Images, videos, 3D models | `public/media/projects/<slug>/…`, `public/media/portrait/…` |

The site reads these files at build time and validates them (`src/content/load.ts`). Invalid content, such as a missing alt text, a broken file or a non-https link, fails the build with a clear message. Draft projects are never published.

## Editing locally (works now)

```bash
pnpm dev
# open http://localhost:3000/keystatic
```

1. **Site identity**: your name, short name, role lines, city and time zone (footer clock), email/phone, social links, portrait, home statement and intro, bio paragraphs, services, footer year and default description.
2. **Projects**: create, reorder (`Display order`), feature on the home page, and set the status:
   - **Draft**: hidden everywhere.
   - **Sample**: preview only; labelled and never indexed.
   - **Published**: real work.
3. **Gallery blocks** in a project. Each block has a *Width* (two consecutive "Half" blocks sit side by side):
   - **Image**: shown uncropped and opens in the full-screen lightbox.
   - **Video**: MP4 plus optional WebM and a poster. A *silent loop* autoplays muted; a *film* gets controls.
   - **Before / after**: two images of the same size with a draggable, keyboard-accessible slider.
   - **3D model (.glb)**: shows the poster first. The 3D viewer (≈ 1 MB) downloads only when the visitor presses "View in 3D".
4. Use the **Preview** button on a project to open `/work/<slug>`.
5. Saving writes the YAML and media files. Review with `git diff`, run `pnpm content:check`, then commit and push.

Uploaded files are named by the CMS (e.g. `cover.jpg`, `media/0/value/image.jpg`). If you add or move files by hand, run `pnpm media:normalize` so names match what the CMS expects.

### Faster: import a folder of work

```bash
pnpm project:add ~/Desktop/new-project --title "Project name" --category 3d
```

- Images are resized to at most 2400 px and become gallery blocks. A file called `cover.*` becomes the cover.
- Videos are converted to MP4 + WebM + poster. This needs `ffmpeg`, and audio is removed unless you pass `--keep-audio`.
- `.glb` files become 3D blocks.
- `before.*` and `after.*` become one before/after block.
- A 1200×630 share image is generated.

The project is created as a **draft** with TODO text. Finish it in `/keystatic`, then set it to *Published*. Name files `01-…`, `02-…` to control the order.

To convert a single video: `pnpm media:video clip.mov [output-folder]`.

## Editing online (GitHub mode, for the deployed site)

In production, local mode is switched off (`/keystatic` returns 404), because a server must not rewrite its own files. To edit from the live site, use GitHub mode. Saving then makes a commit, and the host (e.g. Vercel) rebuilds and redeploys in about a minute.

1. Set `NEXT_PUBLIC_KEYSTATIC_STORAGE=github` and `NEXT_PUBLIC_KEYSTATIC_REPO=owner/repo`. Leave `NEXT_PUBLIC_KEYSTATIC_PATH_PREFIX` unset while the site lives in `portfolio/`; set it to an empty value if you move it to the repo root.
2. Run `pnpm dev` with these settings and open `/keystatic`. Keystatic offers to create a GitHub App for you and writes `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` and `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` to your local `.env`. Install the app on the repository when asked.
3. Copy those values to the host's environment variables (Production). In the GitHub App settings, add the callback URL `https://yourdomain/api/keystatic/github/oauth/callback`.
4. Redeploy. `/keystatic` now asks editors to sign in with GitHub. Only people with write access to the repository can save.

This needs your GitHub account and authorization, so it has not been set up here. Until it is, edit locally and push.

## Safety

- `/keystatic` and `/api/keystatic/*` are `noindex, nofollow` and get their own stricter Content-Security-Policy (they need `api.github.com` and GitHub avatars, which the public site does not).
- In production they return 404 unless GitHub mode and all three secrets are present.
- The GitHub client secret and `KEYSTATIC_SECRET` are server-only and never sent to the browser.
- `pnpm check:launch` fails while placeholder or sample content is published, and warns when the CMS is still in local mode.
