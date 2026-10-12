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
- [x] 2 Research: docs/research/premium-benchmark.md + seo-keywords.md DONE (committed)
- [x] 3 Design system + details DONE (committed 8972e6e)
- [x] 4 Imagery (committed ed9388c): Story Walls (scripts/shop/scenes/walls.mjs, lib/wall.mjs, build-walls.mjs), covers with Pim (lib/cover.mjs), gift art with Pim (lib/giftart.mjs), photo scenes (lib/photos.mjs), pipeline (build-photos.mjs → AVIF+WebP, src/data/shop-images.json). 81 folders rendered, old folders removed. TODO: 300-dpi print PNGs for 3 launch series, final 100% check.
- [x] 5 Copy (committed ed9388c): shop.json, materials, shipping-returns, legal, tada, about, teachers rewritten; catalog renamed (Story Wall, names, URLs); vercel.json 301s. TODO: build passes, final grep.
- [x] 6 Shop UX (committed ed9388c): ProductPage rewritten (descriptor, scene line, trust row, delivery estimate), Picture component, packs without age step (catalog.js packChoice, organisations.astro, shop.js, api/checkout.js). TODO: tests, basket flow check.
- [x] 7 SEO: sitemap with images, robots blocks /admin /cart /checkout /api /basket, llms.txt, titles/descriptions, JSON-LD Product+Offer+shipping, 301s. TODO: Lighthouse after.
- [x] 8 Emails: emails/layout.mjs + templates.mjs (17), scripts/emails/build.mjs → server/emails/compiled.js, server/emails.js render, newsletter double opt-in (server/newsletter.js, api/newsletter-confirm.js, api/newsletter-unsubscribe.js), admin previews /admin/emails, test send script (john@telning.com only).
- [x] 9 Admin + Supabase: supabase/migrations/0001_shop_admin.sql, server/supabase.js (REST, service role, server only), webhook writes orders, scripts/create-admin.mjs (password prepared in .admin-credentials.local, user NOT created: no key), scripts/seed.mjs, src/pages/admin/* + src/scripts/admin.js + src/layouts/Admin.astro.
- [x] 10 QA: audit/after (145 shots), Lighthouse after, tests/flow.test.mjs, a11y 100, final grep clean
- [x] 11 REPORT.md written; push after the final commit

## Doing
- Final commit and push. Open: mobile lab LCP 2.6–2.9 s on photo pages (target 2.5).

## Decisions (short; full list goes to REPORT.md)
- Tote colour label "Natural" → "Undyed" (rule 6 bans "natural"); variant key `natural` stays in code/URLs.
- Product pages share one template, so the audit screenshots cover 6 product templates + all static pages (145 shots), not 112 × 10.
- Basket stays noindex (Lighthouse SEO 66 there is expected).
- Launch series for full-quality print files: Home & Hearts, Paws & Claws, Star Hoppers (first row in the website plan).
- Old image folders (public/shop/img/book-*, poster-*, …) removed; they live in git history and the backup tag.
- Series accents: Funny Pages → red-light, Round the Year → sea (ink and cream were not usable as accents).
- No image API key on this machine: all product photos are code renders of the real print art (allowed by the brief); a real photoshoot list goes in REPORT.md.

## Needs a human
- No `.env` locally: Stripe, Resend, Supabase and image-API keys are not on this machine. Admin user not created yet (needs SUPABASE_SERVICE_ROLE_KEY): run `SUPABASE_SERVICE_ROLE_KEY=… node scripts/create-admin.mjs`; the prepared password is in .admin-credentials.local.
