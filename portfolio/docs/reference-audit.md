# Reference audit — dennissnellenberg.com

**Date:** 2026-10-04 · **Auditor:** Claude Code (cloud container session)

## 1. What could and could not be inspected

| Attempt | Result |
| --- | --- |
| `curl https://dennissnellenberg.com/` from the container | **Blocked** — egress proxy returned `403 CONNECT tunnel failed` (organization network policy) |
| Headless Chromium (Playwright) to the same host | Not attempted after the proxy refusal; the same proxy carries all browser traffic |
| `WebFetch` tool on `/`, `/work`, `/about`, `/contact`, `/work/twice` | **Blocked** — `EGRESS_BLOCKED` for `dennissnellenberg.com` |
| Public mirrors with screenshots (awwwards.com inspiration pages) | **Blocked** — `403` from the egress proxy |
| Web search | Reachable, but returned only page titles (Awwwards element names such as "case header TWICE", "clean contact form"); no layout or motion detail |

No screenshots, recordings or measurements of the live reference exist in this repository. The block was not bypassed (no alternate proxies, caches or mirrors were used once the policy refusal was confirmed).

**Consequence:** every reference detail below is an **approximation from prior general knowledge of this widely-discussed public portfolio**, not a measurement made today. Each item is labelled:

- `recalled` — composition/behaviour I am fairly confident about, not measured.
- `approx` — a value I chose to approximate the recalled look (sizes, colours, timing).
- `assumption` — unsupported guess; candidate for correction from a screenshot.

To raise fidelity, provide desktop (1440 px) and mobile (390 px) screenshots or short screen recordings of Home (top, work list hover, footer), the open menu, Work, About, Contact and one project page. Values in `src/styles/tokens.css` are centralised so they can be tuned in one place.

## 2. Observed-by-recollection details and how they were implemented

### Global
- Flat editorial surfaces: off-white page, charcoal (`#1C1D20`-ish) footer/contact/menu, a mid-gray portrait hero, one restrained blue accent (`#455CE9`-ish) used only for circular CTAs and hover fills. `recalled`
- One neo-grotesk family (Neue Montreal, commercial — **not copied**). Substitute: **Hanken Grotesk** variable (OFL-1.1, via Fontsource), chosen after a side-by-side render against Inter Tight because its width and `a`/`g` shapes sit closer to the original. `approx`
- Sizes scale fluidly with the viewport; big headlines are very large (≈ 6–9 % of viewport width), body copy small and airy. `recalled` / `approx`
- No smooth-scroll hijack is required for the composition; native scrolling is used. `assumption` (the original may use a smooth-scroll library; omitted deliberately per the brief)
- A short multilingual "Hello" preloader. `recalled` — **intentionally not reproduced** (brief: no theatrical loaders hiding content).
- Route changes use a dark curtain that sweeps over the page with the page name. `recalled` — implemented as a short View Transition clip reveal (≈ 600 ms) without locking navigation.

### Header
- Top-left wordmark "© Code by Dennis"; the © rotates on hover. `recalled` → "© Design by {name}", © rotates on hover.
- Top-right text links Work / About / Contact; a small dot appears under the hovered/active link. `recalled`
- Over the gray hero the header text is white; on light pages it is charcoal. `recalled`
- On mobile the links collapse into a "Menu" text trigger. `recalled`

### Hero (Home)
- Full-viewport gray backdrop with a large cut-out portrait anchored to the bottom centre. `recalled` → honest silhouette placeholder until a portrait is supplied.
- Enormous white name followed by an em dash, repeated as a horizontal marquee across the lower part of the hero; direction flips with scroll direction, speed briefly boosts while scrolling. `recalled`
- Left: a charcoal "hanger" pill attached to the left edge, "Located in the Netherlands" with a rotating globe icon. `recalled` → "Located in Baghdad, Iraq".
- Right: a ↘ arrow above "Freelance / Designer & Developer". `recalled` → "Graphic Designer / & 3D Artist" (no "Freelance" claim — availability unset).
- Hero content drifts slightly on scroll (parallax). `recalled` → small transform-only parallax, disabled for reduced motion.

### Intro and work list
- Large positioning statement on the left, a smaller paragraph on the right, and a big charcoal circular "About me" button whose fill rises in blue on hover and which follows the pointer magnetically. `recalled`
- "Recent work" label, then full-width rows separated by thin lines: big project title left, services right. Hovering a row dims/shifts it and shows a floating preview card with the project image on a coloured field plus a blue "View" circle that trails the pointer. `recalled`
- "More work" outlined pill below the list. `recalled`
- Two rows of project images sliding horizontally in opposite directions as you scroll. `recalled`

### Footer
- Section above ends with a curved bottom edge that flattens while scrolling into the dark footer. `recalled`
- Dark footer: small avatar + "Let's work together", a thin line with a big blue magnetic "Get in touch" circle sitting on it, outlined email/phone pills, bottom row with version/edition, local time with GMT offset, and social links. `recalled`

### Floating menu
- After the header scrolls away, a charcoal circular hamburger button scales in at top-right; clicking slides a dark drawer in from the right with "Navigation" label, large links with an active dot, and socials; the page behind is dimmed; the button becomes a close icon. `recalled`

### Work page
- Huge headline, filter pills (All / Design / Development) with superscript counts, list/grid view toggle, list header (Client, Location, Services, Year). `recalled` → categories from real content data; columns Project / Category / Role / Year.

### About page
- Huge headline, ↘ arrow with paragraph, tall portrait on the right; "I can help you with" + three numbered service columns separated by lines. `recalled`

### Contact page
- Fully dark page; "Let's start a project together" headline with avatar; numbered questions ("01 What's your name?" …) as underlined fields; big blue "Send it!" circle; right column with contact details, business details and socials. `recalled`

### Project detail
- Huge title; three meta columns (Role / Services, Credits, Location & year) above a line; blue "Live site" circle overlapping that line when a live link exists; large media on light gray fields; "Next case" block with title and preview; "All work" pill. `recalled`

## 3. Approximate tokens used

| Token | Value | Status |
| --- | --- | --- |
| Page background | `#F5F5F3` | approx (brief fallback) |
| Ink / dark surfaces | `#1C1D20` | recalled |
| Hero gray | `#737679` | **adjusted**: lighter recalled grays (`#999D9E`, `#A9AAAD`) give only 2.3–2.7:1 with white; `#737679` gives 4.57:1 so header links pass AA |
| Accent | `#455CE9` (hover `#334BD3`) | recalled; 5.3:1 with white |
| Muted text on light | `#64666B` | approx, 5.26:1 |
| Muted text on dark | `#9A9B9F` | approx, 6.07:1 |
| Media field | `#E9EAEB` | approx |
| Hairlines | `rgba(28,29,32,.18)` / `rgba(255,255,255,.18)` | approx |
| Hero name size | `clamp(6rem, 17vw, 18rem)` | approx |
| Page headline size | `clamp(2.75rem, 7.2vw, 7.5rem)` | approx |
| Gutter | `clamp(1rem, 5vw, 6rem)` | approx |
| Circular CTA | `clamp(8.5rem, 12vw, 11.5rem)` | approx |

## 4. Visual implementation brief

1. **Hero first**: gray full-height hero (`100svh`), portrait anchored bottom-centre, white marquee name, hanger location pill left, arrow + role right. The accessible `<h1>` holds name + role; marquee copies are `aria-hidden`.
2. **Editorial rhythm**: large vertical section padding, a few type sizes used consistently, thin hairlines, no cards/badges/gradients.
3. **Signature interactions**: magnetic circular CTAs with a rising blue fill; work rows with a pointer-following preview on fine pointers and plain thumbnails on touch; floating menu button + right drawer; curved footer edge; scroll-linked sliding image rows.
4. **Restraint**: all motion transform/opacity based, one GSAP instance for coordinated motion, reduced-motion stops marquee, magnetism, parallax and preview following.
5. **Honesty**: placeholder identity, portrait and sample projects are visibly labelled and excluded from indexing.
