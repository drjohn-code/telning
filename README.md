# Telning Publishing House: website

Picture books for children 0–7, built around decision intelligence. This is the marketing site, built from the
**Telning design system** (web version in `docs/telning-design-system.zip`). Static site built with
[Astro](https://astro.build), hosted on Vercel (`telning.com`). No UI framework; the interactivity is the small
vanilla helper `src/scripts/telning.js`.

## Run

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # tokens → astro build → sitemap → claims-lint → seo-check → legal-check
npm run preview      # serves dist/ (the tests and the screenshot scripts use this)
npm test             # build, privacy + function tests, Playwright (anchors, links, reduced motion, keyboard)
```

Every build fails on a banned claim (`scripts/claims-lint.mjs`), an SEO miss (`scripts/seo-check.mjs`: title,
description, H1, canonical, Open Graph, JSON-LD, sitemap, links, alt text, noindex rules) or, in a production build,
an empty legal placeholder (`scripts/legal-check.mjs`).

## Layout

| Path | What |
| --- | --- |
| `design/tokens.json` | Design tokens (source of truth). `npm run tokens` writes `src/styles/tokens.css`. |
| `design/BRAND.md` | The brand book: rules, voice, safe and banned words. Read it before writing copy. |
| `docs/` | The brief (`telning-claude-code-prompt.md`), the research guideline (claims list), the print design system, the web design-system zip, `components.md` (what changed, what is new), `seo-keyword-map.md`, `seo-launch.md` (what to do in Vercel, Search Console, Bing). |
| `src/data/site-data.json` | Facts that change: series, ages, books, social links, team, story-card settings, legal details, switches (`teamCreditOn`, `pim.art`, `pim.handDrawn`, `claims.firstApproved`). Empty = not known: hide it, never invent it. |
| `src/data/seo.json` | One place for every page's title, description, dates, page type and OG image. |
| `src/data/strings.en.json`, `src/data/pages/*.json` | Shared UI text and per-page copy. Page files are `_draft` until a person checks them. |
| `src/layouts/Base.astro` | The `<head>` for every page (SEO, JSON-LD, preview = noindex). |
| `src/components/` | Landing sections and the shared parts; see `docs/components.md`. |
| `src/pages/` | `/`, `/tada`, `/guide`, `/send`, `/about`, `/pim`, `/teachers`, `/privacy`, `/childrens-privacy`, `/terms`, `404`. |
| `src/styles/telning.css` | All styles (`tn-` classes), phone first. |
| `art/` | The design system's objects, animals, science desk and logo SVGs; `art/pim/` the Pim art; `art/source/` the founder and Pim source files. |
| `public/art/` | The Pim cut-out (WebP + PNG). `public/og/` the Open Graph images. |
| `api/story-card.js`, `server/story-card.js` | The "Send Pim your ending" Vercel function and its pure handler. |
| `api/subscribe.js`, `server/subscribe.js` | The email sign-ups (Letters from Pim, TADA guide, teacher pack): a Resend contact in one segment per list; if the key cannot store contacts, the sign-up is emailed to the team inbox. `server/resend.js` holds the shared Resend calls. |
| `scripts/` | Build checks, `pim-cutout.py`, `pim-svg.py`, `og.mjs`, `shots.mjs` (review screenshots), `indexnow.mjs`. |
| `tests/` | Playwright (`anchors.spec.ts`, `site.spec.ts`) and node tests (`privacy.test.mjs`, `story-card-function.test.mjs`). |

## Environment variables (Vercel → Settings → Environment Variables)

| Name | What |
| --- | --- |
| `RESEND_API_KEY` | Resend, for the story-card form and the sign-ups. Use a **Full access** key so sign-ups are stored as contacts (a sending-only key still works: sign-ups then arrive as emails). Without it both forms answer "not open yet" and nothing is lost silently. |
| `STORY_CARD_INBOX` | The team inbox that receives each submission (or set `storyCard.inbox` in site data). |
| `STORY_CARD_FROM` | The sender, e.g. `Pim <pim@telning.com>` (the domain must be verified in Resend). |
| `STORY_CARD_MODE` | `manual` (default) or `auto` (the Claude API drafts Pim's lines and the note; a person still finishes). |
| `ANTHROPIC_API_KEY` | Auto mode only. Server-side only, never in the browser. |

`VERCEL_ENV` is set by Vercel: preview builds are `noindex`, production never.

## Before going live

- The legal details, the contact address and the story-card settings are in `site-data.json`; the production build stops if one is ever emptied.
- `/guide` and `/send` are printed in the books as QR codes: those addresses never change, and they carry no shop
  links, prices, or the words gift, reward, prize, win, free (claims-lint checks).
- Follow `docs/seo-launch.md` (www redirect, Search Console, Bing).
