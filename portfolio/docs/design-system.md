# Design system

All values live in [`src/styles/tokens.css`](../src/styles/tokens.css); motion timings in [`src/lib/motion.ts`](../src/lib/motion.ts). Change them there, not in components.

## Colour

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `--color-bg` | `#F5F5F3` | Page background | — |
| `--color-ink` | `#1C1D20` | Text, dark surfaces (footer, contact, menu, CTAs) | 16.9:1 on bg |
| `--color-muted` | `#64666B` | Secondary text on light | 5.26:1 |
| `--color-muted-on-dark` | `#9A9B9F` | Secondary text on ink | 6.07:1 |
| `--color-hero` | `#737679` | Hero / portrait backdrop | white text 4.57:1 |
| `--color-accent` | `#455CE9` | Circular CTAs, hover fills, focus ring, "View" cursor | white text 5.30:1 |
| `--color-accent-strong` | `#334BD3` | Hover fill on accent buttons | — |
| `--color-media` | `#E9EAEB` | Neutral field behind gallery media | — |
| `--color-line(-on-dark)` | 18–20 % alpha | Hairlines | decorative |

The hero gray is darker than the recalled reference gray on purpose: lighter grays fail AA for the white header links (see the audit).

## Typography

One family: **Hanken Grotesk** variable (OFL-1.1, self-hosted via `next/font/local`, size-adjusted Arial fallback to avoid layout shift). The site is English-only; **IBM Plex Sans Arabic** (OFL-1.1) stays declared with an Arabic `unicode-range` as a glyph fallback, so it downloads only if Arabic text is ever entered. Licences: `src/fonts/LICENSE-*.txt`.

| Token | Range | Use |
| --- | --- | --- |
| `--text-hero` | 6.5 → 18 rem (17vw) | Marquee name |
| `--text-display` | 2.75 → 7.5 rem | Page headlines, footer "Let's work together" |
| `--text-2xl` | 2.25 → 4.75 rem | Work row titles, section headings |
| `--text-xl` | 1.6 → 2.6 rem | Statements, ledes, form questions |
| `--text-lg` | 1.25 → 1.75 rem | Inputs, lead text |
| `--text-base` | 1 → 1.125 rem | Body |
| `--text-sm` / `--text-xs` | 0.94 / 0.81 rem | Meta, labels |

Display tracking `-0.035em`, display leading `1.02`, body leading `1.55`. Weight 400 throughout (500 only for rare emphasis).

## Space and layout

- Gutter `clamp(1rem, 5vw, 6rem)` (respects safe-area insets); max content width `110rem`.
- Section rhythm `clamp(5rem, 14vh, 11rem)`; header height `clamp(4.5rem, 7vw, 6.5rem)`.
- Breakpoints used: `48rem` (mobile ↔ tablet/desktop), `64rem` (dense desktop grids). Layout is fluid between them; verified at 320–1920 px.
- Touch targets ≥ 44 px for links/buttons; circular CTA `clamp(8.5rem, 12vw, 11.5rem)`; menu button `clamp(3.75rem, 5.4vw, 5rem)`.

## Components

| Component | Type | Notes |
| --- | --- | --- |
| `SiteHeader` | client (pathname) | Wordmark (© rotates on hover), Work/About/Contact with active dot; "Menu" button < 48 rem; light text on Home/Contact |
| `MenuDrawer` + `MenuContext` | client | Floating circular trigger after scrolling past a sentinel; right drawer with curved edge; Escape, focus containment, focus return, `inert` background, scroll lock, closes on navigation |
| `Hero` + `NameMarquee` + `MotionToggle` | server + client | Portrait (or labelled silhouette), accessible `<h1>` with the name, `aria-hidden` marquee copies, location hanger, role, pause control |
| `MagneticLink/Anchor/Button` | client | Surface leans toward the pointer (fine pointers only); fill rises in accent on hover/focus; hit area never moves |
| `ProjectList` | client | Real links; fine pointer → following preview card + "View" cursor; touch/narrow → inline thumbnails |
| `WorkIndex` / `ProjectCard` | client / server | Category filters (only non-empty categories, only if ≥ 2), list/grid toggle, URL state, live result count, empty state |
| `SlidingImages`, `FooterCurve` | server | CSS scroll-driven animations (`animation-timeline: view()`), static where unsupported |
| `ProjectGallery` + `VideoPoster` | server + client | Original aspect ratios on neutral fields; video created only near viewport, muted loop, pauses offscreen, one decoder at a time, play/pause control |
| `SiteFooter`, `LocalTime` | server + client | CTA on the hairline, contact pills only when real data exists, Baghdad time rendered after mount (no hydration mismatch) |
| `ContactForm` | client | Numbered questions, inline errors, live status, duplicate-submit guard, honest states |
| `RevealController` + `SplitText` | client + server | Block fade/slide-up reveals; headlines rise word by word from masks (35 ms stagger). Splits wait for the intro or the curtain. Content is visible without JS, and a 3 s CSS failsafe shows words if JS stalls |
| `Preloader` | client | Once per browser session: "Hello" in a few languages on ink (≈ 1.8 s), then the panel lifts with a curved edge. Set up by an inline boot script before paint, so there is no flash. Skipped with reduced motion, on return visits and without JS. The page underneath is already rendered |
| `PageCurtain` | client | Internal link clicks: an ink curtain with the destination name covers the page (500 ms), the route changes, then it lifts with a curved edge (750 ms). Skipped for modified clicks, the same page, back/forward and reduced motion; a 6 s failsafe always clears it |
| `SmoothScroll` | client | Lenis inertial scrolling (`lerp 0.1`), loaded on demand for fine pointers only. Paused while the menu or lightbox is open; never on touch or with reduced motion |
| `GalleryLightbox` | client | Every gallery image is a real link to the full file (works without JS). With JS, a native `<dialog>` opens: arrows/keys/swipe, click-to-zoom, counter and caption, neighbour preloading, focus returns to the image |
| `CompareSlider` | client | Before/after: a native range input (arrow keys, Home/End) under a draggable handle; announced as "45% Wireframe, 55% Final render" |
| `ModelViewer` | client | 3D `.glb`: poster plus a "View in 3D" button. `@google/model-viewer` (with three.js, ≈ 1 MB) is imported only on press. It shows loading and error (retry) states, drag to rotate, scroll/pinch to zoom, and auto-rotates unless reduced motion is on |
| `Analytics` | client | Optional Vercel Web Analytics or Plausible, both cookieless; off unless configured |

## Motion

| Behaviour | Implementation | Reduced motion / touch |
| --- | --- | --- |
| Name marquee | GSAP ticker (single rAF loop), one transform write per frame; direction follows scroll, speed boost decays; pauses offscreen/hidden tab | Stopped; pause button hidden |
| Magnetic CTAs | `gsap.quickTo` on inner surface/label, elastic release | Off on touch and with reduced motion |
| Work preview | `quickTo` follow, viewport clamped, sizes read on resize only; cleared on leave, blur, menu open, route change, pointercancel | Not rendered on touch; thumbnails instead |
| Sliding rows, footer curve, hero drift | CSS scroll-driven animations | Disabled by media query |
| Menu | CSS transitions 600 ms `cubic-bezier(.76,0,.24,1)`, staggered links | Instant |
| Reveals | CSS 650 ms opacity/translate | Shown immediately |
| Intro (first visit) | Word cycle ≈ 1.8 s, curved lift 800 ms | Skipped |
| Route change | Curtain cover 500 ms → lift 750 ms with destination label | Instant navigation |
| Headline reveal | Words rise from masks, 900 ms, 35 ms stagger | Shown immediately |
| Work filter / view change | Results re-enter with a short staggered rise (only after interaction, never on load) | Instant |
| Scrolling | Lenis smoothing on fine pointers | Native scrolling |

Durations: hover 200 ms, buttons 400 ms, menu 600 ms, reveal 650 ms. GSAP is imported on demand after hydration (`src/lib/gsap.ts`), so it never delays first paint; animation is an enhancement and the site works if it fails to load.

## Deliberate omissions

- The intro, curtain and smooth scroll were added for reference fidelity but stay off the critical path: the page is server-rendered and usable underneath, each plays once, and all are skipped with reduced motion. Smooth scroll never runs on touch devices.
- WebGL only on request: 3D models load when the visitor asks, so project pages keep their image-first performance.
- No site-wide custom cursor and no dark theme. Both were left out because they would change the reference's identity; the "View" cursor appears only over project rows.
- No bento grids, glass cards, gradients-for-decoration, skill bars or badges beyond the honest "Sample" tags.
