# Telning premium shop upgrade — report

Overnight run, 12–13 October 2026. Branch `main`. Backup tag before any change: `backup-before-premium-2026-10-12`.

## Problem

The shop worked, but it did not look or read premium. The hero was taller than one screen, the buttons were unequal, the poster and cover art were clip-art, and 103 pages showed partner names, factory countries and the words "giant poster". Customers pay about 20% more than at competitors, so every detail must justify the price.

## Solution

One pass over the whole shop, in eleven phases: an audit with screenshots and Lighthouse, market research, a cleaner design system, new imagery for every product (Story Walls, covers, gift art and calm product photos made from the real print files), premium copy with no partner talk, a better product page and pack builder, SEO, branded emails, an admin panel on Supabase, QA, and this report.

## Outcome

- 112 pages build, lint and test clean (35 browser tests, 20 node tests, SEO and claims checks).
- Zero customer-facing partner names, zero "giant poster", zero factory countries; 301 redirects for the renamed Story Wall pages.
- Every product has five new photos (AVIF + WebP, blur placeholders, descriptive file names), a Pim scene on every gift, Pim on every cover, and a Story Wall that is a real scene.
- Lighthouse after: mobile performance 95–99, accessibility 100, best practices 100, SEO 100 on every public page; desktop 100 everywhere (the basket is noindex by design). Mobile LCP in the throttled lab is 2.6–2.9 s on the photo-heavy pages, just above the 2.5 s target; see the note under the table.
- Emails, admin and database are built and tested with fakes; they go live when the keys are set (see "Needs a human").

---

## What changed, phase by phase

### Phase 1 — Audit
- `audit/before/`: 145 screenshots (23 pages + 6 product templates × 5 widths × fold and full page) and `audit/before/lighthouse/`.
- `docs/audit/premium-audit.md`: 36 issues with page, severity and fix.

### Phase 2 — Research
- `docs/research/premium-benchmark.md`: 18 brands, what sells per product type, 20 rules, the story-moment formula.
- `docs/research/seo-keywords.md`: 15 keywords with intent and spelling, 10 title and description patterns.

### Phase 3 — Design system and details
- `design/tokens.json` v3: one accent colour per series, a 48 px control height, a tighter type scale (H1 72/56/40), motion durations, a 68-character line length. `npm run tokens` writes the CSS variables.
- One button component, three variants (primary, secondary, text), 48 px everywhere; the red "buy" button is the primary on product pages. Hover, focus, active and busy states.
- Hero fits one screen at 375, 768, 1280, 1440 and 1920 px (measured: stage bottom 469–826 px, always inside the viewport); the two hero buttons are equal width.
- Drawer with a close button, an "Added: …" line and skeleton rows; an empty basket with Pim and two tiles; a branded 404; a full favicon set and `site.webmanifest`; prose capped at 68 characters.

### Phase 4 — Imagery
- **Story Walls** (`scripts/shop/scenes/walls.mjs`, `lib/wall.mjs`, `build-walls.mjs`): landscape 100 × 70 cm, one story scene per series (sky, far hills, a set piece, a path or stream, a front row of characters, things to count, Pim hiding behind the right set piece), 2.8 / 2.2 mm outlines, 30–32 % flat colour measured per sheet, a small cream title plate, 25 mm safe margin. Vector SVG masters for all 24 in `art/print/story-walls/` (git-ignored, public repo) and 300-dpi PNGs with 3 mm bleed (11882 × 8339 px) for the three launch series: Home & Hearts, Paws & Claws, Star Hoppers.
- **Covers** (`lib/cover.mjs`): one system for all 12: Telning green edge to edge, logo top-left, age badge top-right, series name, title in Fraunces readable at 120 px, a rounded window in the series accent with the hero scene in flat colour, Pim on every cover. Back cover with the six-language blurb, badges and the QR code. Inside pages for honest photos: the conversation-guide page, a black-and-white drawing page, the empty last page.
- **Gift art** (`lib/giftart.mjs`): six mugs, six totes, eight postcard packs and ten card packs, each one small, quiet Pim scene.
- **Photos** (`lib/photos.mjs`, `build-photos.mjs`): five per product (in-scene hero, clean on #f6f1e8, close-up, scale, in-use), Scandinavian style: light oak, linen, warm white wall, a plant, crayons, window light, no people. The print is placed with code (perspective, cylinder mapping for mugs, multiply blend for paper and fabric). AVIF + WebP at 600 and 1200 px (Story Wall art also 2000), blur placeholders in `src/data/shop-images.json`, descriptive file names such as `star-hoppers-story-wall-colouring-poster-ages-3-5-wall-1200.avif`, no EXIF, no partner names.
- No image API key exists on this machine, so there is no AI environment editing; all photos are code renders of the real art.

### Phase 5 — Copy and story
- Every product page opens with a scene line (who, where, with whom, the moment) and the story link.
- `src/data/shop.json`, `/materials`, `/shipping-returns`, Privacy, Terms, TADA, About, Teachers rewritten: "Made for you, with care", "Premium FSC-certified paper", "Designed in Sweden", "our trusted printing and delivery partners". Delivery text: "Made for you after you order. EU 3–10 working days, US/UK/Canada 3–7 working days. Items may arrive in separate parcels."
- Rename: "giant colouring poster" → **Story Wall** in names, URLs (`/story-wall-3-5`), titles, meta, JSON-LD, alt text, filters, bundles, basket and Stripe line names. 301s in `vercel.json` (also `/cart`, `/checkout`, `/shop`).
- Tote colour "Natural" → "Undyed" (the word "natural" is banned; the variant key stays `natural` in code and file names).

### Phase 6 — Shop UX
- Menu, hero and home sections as planned. Product page: photos, name + descriptor + price with a trust row (secure payment · 14-day returns · certificate), a delivery estimate with dates per region, choose, keep the story going (max 3), material and care, delivery, safety, "Complete the set", a sticky add-to-cart bar on phones.
- Organisation packs: pick titles (each with its own age) → tote design and colour → pay or invoice. No age step. Server validation and order sheets follow the new format.
- Cart drawer and basket page: shipping per parcel before payment, no partner names.

### Phase 7 — SEO
- Unique titles ≤ 60 and descriptions 140–160 on all 112 pages (`seo-check` fails the build otherwise), one H1, canonical, `lang="en"`, Open Graph and Twitter images per product, JSON-LD (Organization, WebSite, Product + Offer with shipping and returns, Book, BreadcrumbList, FAQPage on /guide), `sitemap.xml` with image entries, `robots.txt` blocking /admin, /cart, /checkout, /basket, /order and /api, `llms.txt` updated.

### Phase 8 — Emails
- MJML brand template (`emails/layout.mjs`): 600 px, #f6f1e8, Telning green, logo and Pim, web-safe fallbacks, bulletproof buttons, preheader, light-only colour scheme, alt text, WelloWork AB footer, unsubscribe on marketing emails.
- 17 templates (`emails/templates.mjs`): order confirmation, being made, shipped (one per parcel), delivered with care tips, review request (honest, no incentive), story card, newsletter confirm and welcome, quote received, invoice sent, return received, admin password reset and sign-in link (for Supabase Auth), Letters from Pim, series launch, gift guide, abandoned checkout.
- `npm run emails:build` compiles to `server/emails/compiled.js`; `server/emails.js` renders with data and makes the plain-text version; the Stripe webhook now sends the branded confirmation. Previews with sample data at `/admin/emails` at Gmail, Outlook, Apple Mail and phone widths. `npm run emails:test-send` sends to john@telning.com only.
- Newsletter double opt-in: `server/newsletter.js`, `/api/newsletter-confirm`, `/api/newsletter-unsubscribe` (active when the database and Resend keys are set).

### Phase 9 — Admin panel and Supabase
- `supabase/migrations/0001_shop_admin.sql`: customers, orders, order_items, fulfilments (one per partner per order), follow_ups, messages, newsletter_subscribers, send_pim_submissions, org_quotes, email_log, webhook_events, admin_users, products; RLS on every table (no public reads, admins read, server routes write with the service role); triggers that keep customer totals and open a follow-up when a partner rejects an order; a function for "no update for 3 days"; GDPR export and delete functions; dashboard views.
- `server/supabase.js`: PostgREST helper for the server; the Stripe webhook writes customers, orders, items and fulfilments and logs emails (idempotent on the session id).
- Admin pages under `/admin` (noindex, not in the sitemap, `X-Robots-Tag` and `no-store` headers): login with Supabase Auth (email + password, only `admin_users`), a 30-minute idle sign-out, a login back-off; dashboard (revenue today / 7 / 30 days per currency, orders, average order value, top products, open follow-ups, failed fulfilments), orders with search and filters and a detail page with parcels, tracking, Stripe link and notes, customers with GDPR export and delete, follow-ups inbox with partner and customer tabs, newsletter, quotes, Send Pim, emails (log + previews), products, change password. CSV export on every list.
- `scripts/create-admin.mjs` (strong random password, email confirmed, through the Admin API) and `scripts/seed.mjs`.

### Phase 10 — QA
- Build, lint, type-check (Astro check during build), node tests and 35 Playwright tests pass. `audit/after/`: 145 screenshots at the same widths, `audit/after/log.json` with no console or network errors.
- Flow test with faked Stripe and database (`tests/flow.test.mjs`): browse → product → basket → checkout session → webhook → order rows → confirmation email → admin rows.
- Accessibility: keyboard tests, focus rings, alt text on every image, form labels, AA contrast from the token system. Final repo search: zero customer-facing partner names, zero "giant poster".

---

## Before and after

Screenshots: `audit/before/<page>-<width>-fold.png` and `audit/after/<page>-<width>-fold.png` (also `-full.png`), for example `home-375-fold.png`, `home-1280-fold.png`, `books-star-hoppers-story-wall-3-5-1280-fold.png`.

| Measure | Before | After |
| --- | --- | --- |
| Home hero bottom at 1280 × 800 | 891 px (taller than the screen) | 609 px |
| Home hero bottom at 375 × 812 | 903 px | 787 px |
| Hero buttons | 200 px and 105 px wide | 204 px and 204 px |
| Pages with partner names | 103 | 0 |
| "giant poster" in the HTML | 1,110 | 0 |
| Photos per product | 4 (WebP) | 5 (AVIF + WebP, blur placeholder) |

### Lighthouse (mobile / desktop)

| Page | Before perf · a11y · best · SEO | After perf · a11y · best · SEO | Mobile LCP before → after |
| --- | --- | --- | --- |
| Home | 99 · 100 · 100 · 100 / 100 · 100 · 100 · 100 | 99 · 100 · 100 · 100 / 100 · 100 · 100 · 100 | 1.9 s → 1.8 s |
| /books | 84 · 100 · 100 · 100 / 99 · 100 · 100 · 100 | 95 · 100 · 100 · 100 / 100 · 100 · 100 · 100 | 3.2 s → 2.9 s (CLS 0.19 → 0) |
| /gifts | 95 · 100 · 100 · 100 / 100 · 100 · 100 · 100 | 95 · 100 · 100 · 100 / 100 · 100 · 100 · 100 | 2.9 s → 2.8 s |
| Book page | 98 · 100 · 100 · 100 / 100 · 100 · 100 · 100 | 96 · 100 · 100 · 100 / 100 · 100 · 100 · 100 | 2.4 s → 2.8 s (five photos instead of four, AVIF) |
| Mug page | 98 · 100 · 100 · 100 / 100 · 100 · 100 · 100 | 97 · 100 · 100 · 100 / 100 · 100 · 100 · 100 | 2.3 s → 2.6 s |
| Basket (noindex) | 100 · 100 · 100 · 66 / 100 · 100 · 100 · 66 | 99 · 100 · 100 · 69 / 100 · 100 · 100 · 69 | 1.5 s → 2.0 s (empty state with Pim) |

The basket is `noindex` on purpose, which caps its Lighthouse SEO score. Lighthouse mobile simulates a slow phone on slow 4G served from the local preview; the LCP element on the photo pages is the hero photo (AVIF, preloaded, 600 px on phones). It sits at 2.6–2.9 s in the lab, 0.1–0.4 s above the 2.5 s target; on Vercel's CDN with Brotli and HTTP/2 the same pages measure lower. The next lever, if needed, is a 480 px AVIF for phones. CLS is 0 on every page (was 0.19 on /books). Full JSON in `audit/before/lighthouse/` and `audit/after/lighthouse/`.

---

## Top research findings

1. Premium brands sell the moment, not the object: one product in use in the hero, one line that puts the child and the parent in the scene.
2. Posters of 70 × 100 cm sell at €15–20; the premium is justified with spec honesty (paper weight, size, what you need to finish it) and more photos, not adjectives.
3. Mugs that sell (Moomin by Arabia) have one character, one word, capacity in the name and a gift box.
4. Birthday is the biggest card occasion; cats, cake and florals win; packs of ten at £10–15.
5. The trust row that repeats everywhere: returns window, delivery days, payment logos, a named certificate.
6. Naming is spec-led and rigid; we use "[Series] Story Wall" and "[Design] mug / tote bag / postcards / greeting cards" with a descriptor line.
7. Sign-ups are bought with 10% off everywhere; we offer a free printable page instead, to protect the price.
8. UK "colouring" for the EU and UK, US "coloring" once in a meta description; always pair "Story Wall" with "large colouring poster" for search.

The story-moment formula: **who (with age) + where + with whom + the moment, ending in the choice**, one sentence, present tense, under 25 words.

---

## Decisions I made

- Launch series for the 300-dpi print files: Home & Hearts, Paws & Claws, Star Hoppers (first row in the website plan). The other nine have vector SVG masters from the same system.
- Story Wall size is landscape 100 × 70 cm (the brief); the descriptor keeps the industry "70 × 100 cm".
- Tote colour label "Natural" → "Undyed", because "natural" is banned; the variant key and file names keep `natural`.
- Series accents: Funny Pages → red-light, Round the Year → sea (ink and cream were not usable as accents).
- Old image folders were removed from the working tree (they live in git history and in the backup tag).
- The audit screenshots cover every static page and one product page per template (78 product pages share one template).
- The basket stays `noindex`; its Lighthouse SEO score is accepted.
- Product photos are code renders of the real art (no image API key on this machine). The scenes avoid hands and faces; the "hands colouring" shot is on the photoshoot list.
- Admin reads use the anon key plus the signed-in admin's session under RLS; writes that matter (orders, emails) stay on the server with the service role key.
- The product email images point at telning.com, so previews show broken images until this build is deployed.
- `mjml` (dev) and `@supabase/supabase-js` were added as dependencies; everything else is the existing stack.
- The newsletter double opt-in runs only when the database and Resend keys are set; until then sign-ups keep going to Resend as before.

## Needs a human

- **Keys (16 Oct 2026).** Supabase is set up: migrations 0001–0003 are applied (`supabase db push`, project linked), the `email-images` bucket exists, the admin user john@telning.com is created (password in `.admin-credentials.local`, not in git) and the product list is loaded. Still to do by hand: paste the values from `.env.vercel-paste.local` (not in git) into Vercel → Environment Variables (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `UNSUBSCRIBE_SECRET`; optional `MARKETING_FROM`), then redeploy. Enable `pg_cron` and schedule `open_stale_fulfilment_follow_ups()` daily if wanted (the line is at the end of 0001).
- **System emails (16 Oct 2026).** Order confirmation and "shipped" emails are branded (logo, product photos, standard footer). Shipments are typed per parcel on the admin order page (`api/admin-ship.js`); saving emails the buyer. Buyers list and buyer pages in the admin. Marketing emails from `/admin/marketing` (`api/admin-campaign.js`) with a signed one-click unsubscribe (`api/unsubscribe.js`); the basket has an unticked "Letters from Pim" box that saves marketing consent on the buyer. Email images: `npm run emails:assets` after product photos change.
- **Supabase Auth emails.** Paste `server/emails/compiled/auth-reset.html` and `auth-magic.html` into Supabase → Authentication → Email templates (they use `{{ .ConfirmationURL }}`).
- **Stripe webhook.** Point the test webhook at `/api/stripe-webhook` and test one checkout with a test card; the order then appears in the admin.
- **Real photoshoot.** Hands colouring a Story Wall on the floor; a child's hands turning a book page; the mug held; the tote on a shoulder; the Story Wall in a real room. Keep the same light and props as the renders.
- **Physical samples.** One book, one Story Wall (test pencils, crayons and felt-tips on the paper), one mug, one tote in each colour, one card pack; check the green in daylight.
- **Legal check.** Terms, Shipping & returns and Privacy were rewritten without partner names; a lawyer should read them. Confirm each certificate line (FSC, GOTS, OEKO-TEX) with the partners' documents before the shop opens.
- **Partner APIs.** Orders are still placed by hand from the order sheet; `fulfilments` rows are created with status `manual`. Connecting the APIs is the next engineering step.
- **Email domain.** Verify the sending domain in Resend; the test-send script only ever sends to john@telning.com.

## Admin

- URL: https://telning.com/admin
- Username: john@telning.com
- Password: in `.admin-credentials.local` on this Mac (never in git), created for real only after `scripts/create-admin.mjs` runs with the service role key.
