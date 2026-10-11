# Premium audit (before) — telning.com, 12 Oct 2026

Local build of commit `01444dc` (tag `backup-before-premium-2026-10-12`). Screenshots: `audit/before/<page>-<width>-fold.png` and `-full.png` at 375, 768, 1280, 1440 and 1920 px (23 static pages + 6 product templates = 145 shots; the 78 product pages share one template). Lighthouse JSON: `audit/before/lighthouse/`.

Severity: **High** = hurts trust or breaks a hard rule · **Medium** = looks cheap or unclear · **Low** = polish.

## 1. Lighthouse (before)

| Page | Mobile perf / a11y / best / SEO | Desktop perf / a11y / best / SEO | Mobile LCP | Mobile CLS |
| --- | --- | --- | --- | --- |
| Home `/` | 99 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 1.9 s | 0 |
| `/books` | **84** / 100 / 100 / 100 | 99 / 100 / 100 / 100 | **3.2 s** | **0.192** |
| `/gifts` | 95 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 2.9 s | 0 |
| Book page | 98 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 2.4 s | 0 |
| Mug page | 98 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 2.3 s | 0 |
| `/basket` | 100 / 100 / 100 / 66* | 100 / 100 / 100 / 66* | 1.5 s | 0 |

\* The basket is `noindex` on purpose (private page). Lighthouse marks every noindex page down on SEO; this is expected and stays.

## 2. Issues

### Hard rules (High)

| # | Page | Issue | Fix |
| --- | --- | --- | --- |
| H1 | 103 pages | Partner names visible to customers: "Printful" (12×), "Lulu" (4×), "Gelato" (4×) on `/materials`, `/shipping-returns`, the tote materials text ("Printful's own sewing and print shops in Latvia, Spain…"), the basket summary ("Shipping: books (Lulu, 1 item)") and the Stripe shipping label. | Remove every name from customer text; say "our trusted printing and delivery partners" on legal pages; drop partner from the basket summary and Stripe labels. Keep names in server code only. |
| H2 | 103 pages | "giant colouring poster" / "giant poster" 1,110× in product names, URLs (`/giant-poster-3-5`), titles, meta, JSON-LD, alt text, OG images, filters, bundles. | Rename to **Story Wall** everywhere; descriptor "Colouring poster · 70 × 100 cm"; new URL `/story-wall-3-5`; 301 from the old URLs; "large colouring poster" only in body and meta text. |
| H3 | 123 places | Factory countries: "Printed to order near you, in France, the UK, the US or Canada" (book materials, trust bar, basket page notes, `/materials`, `/shipping-returns`). | "Made for you after you order. EU 3–10 working days, US/UK/Canada 3–7 working days." No countries. |
| H4 | `/organisations`, checkout | Packs have an age-group step (step 2) and family bundles are fixed to one age. | Remove the age step: the buyer picks titles directly (book 3–5 or 5–7 per title); keep age badges on product pages only. |
| H5 | `/about` | "Telning Publishing House is made in Sweden." | "Designed in Sweden." |
| H6 | `/materials` | The page quotes the banned words ("eco-friendly", "green", "sustainable") while saying we do not use them. | Rewrite without the words: "We name the certificate, not a slogan." |
| H7 | `/tada`, `/gifts` | "A promised prize makes children draw less" uses "prize". | Rephrase: "a promised present"; keep the research point. |
| H8 | tote pages, packs, basket | Colour name "Natural" (393×) is a banned word under the green-claims rule. | Colour label "Undyed" (the cotton is undyed); the variant key `natural` stays in code and URLs. |
| H9 | `/404` | Copy says "Telning is under development", which is no longer true with a live shop. | Branded 404: Pim, "This page wandered off", links to Books & posters, Gifts, home. |
| H10 | all pages | No `manifest`, no 192/512 icons; favicon set is partial (svg, 32 px, apple-touch). | Full favicon set + `site.webmanifest`. |

### Hero, buttons, layout (Medium)

| # | Page | Issue | Fix |
| --- | --- | --- | --- |
| M1 | Home | Hero is taller than one screen: bottom at 891 px on a 1280 × 800 screen, 903 px on 375 × 812. The headline is 96 px and the stage 560 px; Pim's bubble and the fox overlap the stage edges. | Hero ≤ 100svh including the header: headline 56–72 px desktop / 40 px phone, stage height from the viewport (`min(46svh, 520px)`), lead shorter, Pim line under the stage. |
| M2 | Home | Hero buttons are unequal (Books & posters 200 px wide, Gifts 105 px) and two filled buttons compete. | Button system: one primary (ink) + one secondary (outline) per section; hero buttons equal width (grid 1fr 1fr, max 440 px). |
| M3 | all | Button heights differ: 40 px phone, 52 px tablet, 56 px desktop; `.tn-btn--buy` 52 px; buy bar 44 px; chips 36 px. | One height (48 px) for every button and chip row; padding 0 24 px; radius pill; three variants only (primary, secondary, text). |
| M4 | `/books` phone | CLS 0.192 and LCP 3.2 s: the hero art stack and the filter bar (`hidden` until JS) shift the grid. | Reserve space for the filter bar (no `hidden`; render as static, enhance with JS), fixed aspect boxes on hero images, `fetchpriority` only on the LCP image. |
| M5 | product pages | On phones the price and "Add to basket" sit 1,400–1,780 px down; the buy bar appears only after scrolling past the form. | Keep the sticky bar; show it once the main button leaves the screen in either direction; add price + variant to the bar. |
| M6 | `/basket` | Empty state is a plain sentence; no picture, no suggestions. | Empty-cart illustration (Pim), two tiles (Books & posters, Gifts), "Keep the story going" picks. |
| M7 | drawer | The drawer works but has no loading or added-state feedback, no close button in the header, and the total jumps while the catalogue JSON loads. | Added-state line ("Added: …"), close button, skeleton rows while loading, totals reserved height. |
| M8 | product pages | Trust row ("Made to order…", "14 days", "Stripe") is below the facts; the price has no trust row beside it and no delivery estimate with dates. | Trust row directly under the price: secure payment · 14-day returns · certificates; a delivery estimate line ("Order today, arrives DD–DD Mon") per region. |
| M9 | all | Typography: body line length is ~90 characters on desktop in `.tn-prose` on legal pages; headings use `text-wrap: balance` already. | `max-width: 68ch` on prose; keep two families (Fraunces, Instrument Sans). |
| M10 | `/organisations` | The pack builder is a long form with four fieldsets; prices show a struck full price in a loud way. | Three steps: titles → tote design and colour → pay or invoice; prices quiet ("Save 10%" pill stays). |

### Copy and tone (Medium)

| # | Page | Issue | Fix |
| --- | --- | --- | --- |
| C1 | product pages | Product names carry colons and nouns: "Pim mug: The moon", "Tote bag: Library day", "Star Hoppers giant colouring poster". | Premium names: "The Moon mug", "Library Day tote", "Star Hoppers Story Wall"; descriptor line under the name. |
| C2 | product pages | The scene line is the same for every product of a type (6 mugs share one line). | One scene line per product (who, where, with whom, the moment) from the research formula; then the story link. |
| C3 | product pages | "We show the cover only. The pages inside stay a surprise" is a weak excuse for missing inside photos. | Add honest photos of the real inside: an open spread (guide left, line art right) and the empty last page. |
| C4 | `/shipping-returns`, materials | Delivery text names printers and countries; "mockup" appears in the script comments only (not customer-facing). | Rewrite to the approved delivery text. |
| C5 | `/books`, `/gifts` | Collection heroes carry three pills ("12 series", "Printed near you") that read like filters. | One quiet line: "Designed in Sweden · Premium FSC-certified paper · 14-day returns". |

### Imagery at 100 % (High for a premium shop)

Checked: the first 1200 px photo of every product type, the Story Wall art and wall shots, book front/back/table/stand, mug white/colour/table, tote scene/detail, postcard scene, card envelope.

| # | Images | Issue | Fix |
| --- | --- | --- | --- |
| I1 | 24 poster `art`, `wall`, `detail`, `tube` | The poster is a scatter of clip-art objects on a white sheet (stars, rockets, animals in a row), not one story scene. The ages 5–7 version is cluttered, the 3–5 version is empty. Portrait 70 × 100. No hidden Pim, nothing to count, no title typography system. It does not look like wall art. | Redesign as the **Story Wall**: landscape 100 × 70 cm, one scene per series world (ground, sky, a path, buildings/trees as big open shapes), ~30 % flat colour spread across the sheet, 2–3 mm outlines, a hidden Pim, small animals and things to count, a small elegant title. Vector SVG master + 11811 × 8268 px print PNG with 3 mm bleed. |
| I2 | 24 book `front` | Covers: green ground, cream line objects in a row, a title plate. No Pim, no scene, same objects as the posters. Readable at 120 px (good). | One cover system for all 12: green edge to edge, a hero scene in a rounded window with the series accent, Pim on every cover, title in Fraunces, age badge and logo in fixed spots. |
| I3 | 24 book `back` | Back cover is clean but the blurb repeats the hook; marks are small. | Keep the layout; use the six-language blurb from the plan, bigger badges. |
| I4 | mugs (`white`, `colour`, `table`) | The print is the raster Pim cut-out (soft, blurred edges) next to flat vector stars: two styles on one mug. The mug body is a CSS cylinder with a flat highlight. | Vector Pim only (art/pim SVG), one quiet scene per design; mug render with a proper cylindrical warp of the print, soft window light, a breakfast scene. |
| I5 | totes (`scene`, `detail`) | The print is tiny (about 12 % of the bag); the handles are two flat arches; the "scene" shows the book sticking out of the bag at a wrong scale. | Bigger print (about 30 % of the front), real strap shape, fabric weave multiply, a library-trip and park-bench scene; black and natural (undyed) only. |
| I6 | postcards (`scene`) | The pencil sits on top of the writing; the back is empty; no stamp or handwriting as asked. | Back with handwriting and a stamp; the pack of 10 with a paper band; a flat lay. |
| I7 | cards (`envelope`) | Fine as a flat lay, but the envelope has no texture and the card art is clip-art (bear + four balloons). | Keep the flat lay; new quiet Pim scene per design; paper texture on the envelope. |
| I8 | all | No AVIF, no blur placeholder; only 600/1200 px (posters 2000). Files are already WebP with width/height set (good). | Add AVIF + WebP `<picture>`, blur placeholder (inline tiny WebP), responsive `sizes`, descriptive filenames (`star-hoppers-story-wall-colouring-poster-…`). |
| I9 | all | No partner logos or watermarks found. No faces. No AI artefacts (all art is code-made). | Keep code-made product renders; list the shots that need a real photoshoot in the report. |

### Links and speed

- No broken internal links (seo-check passes: 112 pages, two links in and out each).
- No console errors or 4xx responses during the screenshot run (`audit/before/log.json`).
- Mobile LCP on `/books` and `/gifts` is 2.9–3.2 s: the hero art is a 1200 px WebP loaded with `fetchpriority="high"` plus a second 600 px image.

## 3. Summary

The site is fast and accessible, but it does not look or read premium: the hero is too tall, buttons are unequal, the poster and cover art is clip-art, and partner names, factory countries and "giant poster" wording break the brand rules on 103 pages. The imagery (Story Walls, covers, gift renders) is the biggest piece of work, followed by the rename, the copy and the organisation packs.
