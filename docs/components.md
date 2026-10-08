# Telning website components: what changed and what is new (site v2, October 2026)

The design-system zip (`docs/telning-design-system.zip`) holds the original component READMEs. This file records
the changes the site v2 work made, and documents every new page and component. The repo's living code is in
`src/components`, `src/pages`, `src/data` and `src/styles/telning.css`.

## Changed components

**Header.** No language switch any more: the site has one language (`<html lang="en">` stays; `languages: { en: "ready" }`).
On phones the menu button is the hamburger icon only (no badge), 44 px tap area, screen readers hear "Menu".
Links are `/#ages`, `/#series`, `/#skills`, `/guide`, `/about`; the current page gets `aria-current="page"`.

**Footer.** Instagram, TikTok and LinkedIn from site data `social` (shown only when set), in that order, icon + name,
no boxes: colour change on hover, 44 px tap area, focus ring kept. On phones the footer is smaller: 13 px links,
tighter spacing, 20 px icons in one row, more room under the walking animals. The icons live in `socialIcons.ts`.

**SeriesWorlds (Series.astro + WorldCard.astro).** A card is a link only when the series' `status` is `out`;
otherwise a `<div>` with the soft grey "Coming soon" pill (`tn-pill--soft`), no tilt, no lift, not in the tab order.
Screen readers hear "Home & Hearts, Family & friends, Coming soon". The intro line was removed.

**AgeStrip.** Data-driven from `ages` and `books`: a card links to `/books?age=…` only when a book of that age is
out; otherwise the soft pill. "Find by age"; "Toddler, ages 0–3".

**Pill.** New `tn-pill--soft` (paper-deep / ink-soft) for "Coming soon". Pills are 11–12 px.

**LandingPage.** Hero button "Our publications" → `#series`; link "The TADA method" → `#tada` (the TADA band has
`id="tada"`). Intro lines under "Our series" and "Decision intelligence at the heart" removed. Pim appears in the hero
greeting, the skills note and "Letters from Pim". The "send your ending" card holds a crayon drawing (KidDrawing).

**TrustBand.** Link reads "About us" → `/about`.

**BookCover.** Redesigned: the whole cover in the series colour, a scene from the Objects library (65 %), the series
name on a cream title plate with the colophon, spine edge, page edges, token shadow, small idle motion. Reads at
120 px. `coverImage` replaces the scene when the illustrator's cover exists. Not a link.

**PimNote, ArtSlot, Objects.** Pim's art exists now: `Pim.astro` (poses full / portrait / peek; `pim.art` switch
between the paper SVG and the cut-out image; one motion at most). PimNote uses the portrait in a sky-light disc.
Code still never invents a different Pim or a series main character; the Objects library stays decoration only.
New objects: star, road, chair, bubble-q, mailbox. `Obj.astro` inlines any art file with colour tokens and can
recolour one token per use (`swap`).

**EmailBlock.** Takes props (`id`, `tag` news | guide | teacher, texts) and posts its tag; used on `/`, `/guide`,
`/teachers`.

## New components

| Component | What it is |
|---|---|
| `Obj.astro` | Inline paper object/animal from `art/` with tokens; `swap` recolours; `flat` removes the drop shadow. |
| `Pim.astro`, `PimNote.astro` | Pim (see above) and the note with the bubble. |
| `BookCover.astro`, `WorldCard.astro` | The covers and the series cards. |
| `KidDrawing.astro` | A child-like crayon drawing (never Pim) for cards and scenes. |
| `StoryCard.astro` | The story card (print design section 12 in web tokens); `sample` adds the label. |
| `PageHero.astro`, `Breadcrumbs.astro` | Inner-page opening: breadcrumbs, kicker, H1 (the LCP, never animated), lead, own paper scene. |
| `Faq.astro` | `<details>` questions (text stays in the HTML); pages add the FAQPage JSON-LD. |
| `LegalPage.astro` | The calm legal layout (envelope scene, table of contents, sections, "Last updated", staging draft label). |

## New pages

Each page's copy lives in `src/data/pages/<page>.json`, marked `_draft` until a person checks it. Titles,
descriptions, dates and page types are in `src/data/seo.json`.

| Page | Signature scroll story | Notes |
|---|---|---|
| `/tada` | The paper road: stops T, A, D (fork + signpost), A (frame where a crayon drawing draws itself). | Article JSON-LD with citations; sources from the guideline only; team line only when `teamCreditOn`. |
| `/guide` | The open book whose pages turn, one TADA object per leaf (sticky on desktop). | QR page: no gift/reward/prize/win/free (claims-lint). Guide sign-up (tag `guide`); download when `guidePdf` is set. FAQPage JSON-LD. |
| `/send` | Drawing → envelope → paper plane → Pim at the mailbox → card flies back. | The form (brief 5.1) with crop/rotate/zoom; privacy words = the real flow; FAQPage JSON-LD. QR page rules. |
| `/about` | Seed → shoot → tree beside the timeline. | Who we are (team cards only from site data), how a book is made, promises, the name, contact. The founder note was removed on the owner's request. |
| `/pim` | A crayon scribble fills a big leaf. | "Made by hand" section only when `pim.handDrawn` and `illustratorName` are set. |
| `/teachers` | Children's drawings clip onto a string one by one. | "SEL" and "speech therapists" allowed here. Teacher pack sign-up (tag `teacher`). |
| `/privacy`, `/childrens-privacy`, `/terms` | — | From `legal.json`; placeholders from site data; `legal-check` stops a production build while one is empty. |
| `404` | — | Pim sits and blinks. Real 404 status, not in the sitemap, no redirect. |

## Scroll stories: how they work

`Telning.initView` gives every `.tn-view` element a `--p` from 0 (top edge enters at the bottom of the viewport) to 1
(bottom edge leaves at the top). CSS turns `--p` into transforms and opacity, only under `.tn-js`, so the final state
shows without JavaScript; under `prefers-reduced-motion` `--p` is 1 and nothing moves. Only `transform`, `opacity`
and `stroke-dashoffset` animate. Native `animation-timeline: view()` can be layered on later; one JS path was chosen
so every browser behaves the same.

## Motion rules kept

UI controls keep `--move` (220 ms). Idle motion: one or two objects per section. Pim: the stars twinkle, or the eye
blinks (404), never both. Everything stops under reduced motion (`tests/site.spec.ts` checks).
