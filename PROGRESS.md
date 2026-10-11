# PROGRESS — Telning premium shop upgrade (overnight run, 12 Oct 2026)

Running log so work can continue after a context reset. Keep it short: done / doing / next.

## Stack (detected)
- Astro 7 static site, vanilla JS (`src/scripts/*.js`), one CSS file (`src/styles/telning.css`) + tokens from `design/tokens.json`.
- Hosting: Vercel (`vercel.json`, functions in `api/*.js` → pure handlers in `server/*.js`). Stripe via REST (no SDK). Resend for email.
- Shop data: `src/data/shop.json`, `shop-books.json`, `shop-gifts.json`; catalogue built in `server/catalog.js`.
- Art + photos: `scripts/shop/build-art.mjs` (print masters → `art/print/`, git-ignored) and `build-photos.mjs` (Playwright → `public/shop/img/<sku>/<view>-<w>.webp`).
- Tests: Playwright (`tests/*.spec.ts`) against `astro preview`, node tests (`tests/*.test.mjs`). Build runs sitemap, claims-lint, seo-check, legal-check.
- Tools on this Mac: Node 25, PIL 11 (no numpy, no ImageMagick), sharp in node_modules, Playwright + Chromium, Lighthouse 13.5, supabase CLI (not linked), gh (logged in). No `.env` file → no Stripe/Resend/Supabase/image-API keys locally.
- Plan files: `~/Downloads/Telning Product Lines Plan v2 (Books + Gifts).md`, `~/Downloads/Telning Website v2 Books + Gifts.md` (read).

## Backup
- Tag `backup-before-premium-2026-10-12` created and pushed. DONE

## Phases
- [x] 1 Audit (audit/before 145 shots, Lighthouse 6 pages × 2, docs/audit/premium-audit.md) DONE
- [~] 2 Research: background agent writing docs/research/premium-benchmark.md + seo-keywords.md
- [ ] 3 Design system + details
- [ ] 4 Imagery (Story Walls, covers, gift photos)
- [ ] 5 Copy + partner-name purge + Story Wall rename + 301s
- [ ] 6 Shop UX (menu, hero, product page parts, cart drawer, sticky bar, packs without age step)
- [ ] 7 SEO
- [ ] 8 Emails (MJML, Resend, preview route)
- [ ] 9 Admin + Supabase (migrations, scripts, admin pages)
- [ ] 10 QA (after screenshots, flow test, a11y, final grep)
- [ ] 11 REPORT.md + push

## Doing
- Phase 3: design tokens, button system, hero ≤ 100svh, details.

## Decisions (short; full list goes to REPORT.md)
- Tote colour label "Natural" → "Undyed" (rule 6 bans "natural"); variant key `natural` stays in code/URLs.
- Product pages share one template, so the audit screenshots cover 6 product templates + all static pages (145 shots), not 112 × 10.
- Basket stays noindex (Lighthouse SEO 66 there is expected).

## Needs a human
- No `.env` locally: Stripe, Resend, Supabase and image-API keys are not on this machine.
