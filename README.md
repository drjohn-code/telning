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

## The shop (Books & posters, Gifts)

Our own code with Stripe Checkout; no Shopify. Every price, shipping fee and product text is in three data files:
`src/data/shop.json` (prices per currency, parcels and fees, product types, packs), `src/data/shop-books.json`
(the 24 book stories and poster texts) and `src/data/shop-gifts.json` (mug, tote, postcard and card designs).
`server/catalog.js` builds the catalogue from them for the pages, the basket and the Vercel functions.

| Path | What |
| --- | --- |
| `src/pages/books/…`, `src/pages/gifts/…` | Collections, series pages and one product page per item (`src/components/shop/ProductPage.astro`). |
| `/basket`, `/order/thanks`, `/organisations`, `/materials`, `/shipping-returns` | Basket, thank-you, story packs + quote form, materials, delivery and returns. |
| `src/scripts/shop.js` | Basket (on the device, localStorage), currency switch, drawer, gallery, filters, packs, quote form. |
| `api/checkout.js` → `server/checkout.js` | Basket → Stripe Checkout Session. Prices and shipping always from the server. |
| `api/stripe-webhook.js` → `server/orders.js` | After payment: emails the team an order sheet split by printer (Lulu, Printful, Gelato) and the customer a confirmation. Printer APIs plug in through `partners`. |
| `api/quote.js` → `server/quote.js` | Quote requests from `/organisations`, emailed to the team. |
| `scripts/shop/` | The art and photo studio: `build-art.mjs` (posters, covers, gift print files into `art/print/`, git-ignored because the repo is public) and `build-photos.mjs` (product photos in `public/shop/img/`, OG images). Run `node scripts/shop/build-photos.mjs all` after art changes and commit the images. |

## Environment variables (Vercel → Settings → Environment Variables)

| Name | What |
| --- | --- |
| `RESEND_API_KEY` | Resend, for the story-card form and the sign-ups. Use a **Full access** key so sign-ups are stored as contacts (a sending-only key still works: sign-ups then arrive as emails). Without it both forms answer "not open yet" and nothing is lost silently. |
| `STORY_CARD_INBOX` | The team inbox that receives each submission (or set `storyCard.inbox` in site data). |
| `STORY_CARD_FROM` | The sender, e.g. `Pim <pim@telning.com>` (the domain must be verified in Resend). |
| `STORY_CARD_MODE` | `manual` (default) or `auto` (the Claude API drafts Pim's lines and the note; a person still finishes). |
| `ANTHROPIC_API_KEY` | Auto mode only. Server-side only, never in the browser. |

| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` while testing, `sk_live_…` to sell). Without it the basket says "The shop opens very soon" and nothing is charged. |
| `STRIPE_WEBHOOK_SECRET` | From Stripe → Developers → Webhooks → endpoint `https://telning.com/api/stripe-webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. |
| `STRIPE_TAX` | `on` turns on Stripe Tax (set up the tax settings in Stripe first). EUR and GBP prices include VAT; USD and CAD add sales tax. |
| `STRIPE_TERMS` | `on` asks the buyer to accept the terms at checkout (set the terms URL in Stripe → Settings → Public details first). |
| `ORDER_INBOX` | Team inbox for order sheets and quote requests (falls back to `STORY_CARD_INBOX`, then `contactEmail`). |
| `ORDER_FROM` | Sender of order emails, e.g. `Telning <orders@telning.com>` (falls back to `STORY_CARD_FROM`). |

`VERCEL_ENV` is set by Vercel: preview builds are `noindex`, production never.

## Before going live

- The legal details, the contact address and the story-card settings are in `site-data.json`; the production build stops if one is ever emptied.
- `/guide` and `/send` are printed in the books as QR codes: those addresses never change, and they carry no shop
  links, prices, or the words gift, reward, prize, win, free (claims-lint checks).
- Follow `docs/seo-launch.md` (www redirect, Search Console, Bing).
