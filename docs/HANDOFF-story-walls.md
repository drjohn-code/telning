# Handoff: Telning Story Walls and gift photos (14 Oct 2026)

Give this file to a new Claude Code chat in this project folder. Say: "Read docs/HANDOFF-story-walls.md and continue."

## How John works

- Simple English, short answers, Problem / Solution / Outcome.
- Show screenshots at 375 px and 1280 px before asking for OK.
- Never push to `main` without John's OK. Vercel deploys `main` to telning.com.
- Never invent facts or claims. Mark new copy as DRAFT.
- No partner names (Lulu, Printful, Gelato) in customer-facing text.
- No photos of children's faces: hands only.
- The Google API key is only in `.env.local` (git-ignored). Never print it or commit it. The GitHub repo is public.
- John sends style pictures from the web as taste only. Never send them to the image model and never copy their characters (they are other artists' work). Describe the look in words.

## What is live (on `main`)

- 20 Halloween gifts with real AI photos, 3 per product (table, home, hand), all orderable. Commits `9fb7fb4` and `9bcd1e5`.
- Art style per product (John's choice):
  - mugs: embroidery look
  - tote bags: patchwork look
  - postcards: screen-print crowds, A6
  - greeting cards: square 14.1 × 14.1 cm; linocut for one animal, mid-century gouache for many animals
- Christmas and New Year (15 Oct 2026, theme `winter`): 4 postcards + 4 greeting cards, whimsical Nordic folk art
  (big-eyed cats and dogs, folk botanical patterns, full painted night scenes).
- Birthday (15 Oct 2026, theme `birthday`): 8 postcards + 8 greeting cards, 4 for girls and 4 for boys each, a child with
  pets. Art style and technique (John): Scandinavian mid-century folk art style. Gouache painting texture, dry-brush
  acrylic strokes, and visible colored pencil grain. The birthday product pages show it as the 'Art style' row
  (`artStyles` in `src/data/shop-gifts.json`). Gift grids have a For: Girls / Boys filter (`child`).
- Product gallery: a click on a thumbnail changes the big photo. A Playwright test covers it.
- Scripts: `scripts/catalog/generate_mockups.py` and `prompts.json` (gifts), and `scripts/shop/import-mockups.mjs`.

## What is in progress: Story Walls (branch `story-walls-v2`, NOT live)

A Story Wall is a 100 × 70 cm colouring poster.
- Families unroll it on the floor and colour it together, then frame it.
- There are 12 series with 2 products each (ages 3-5 and 5-7), so 24 products. Since 15 Oct 2026 the site's age groups are 1–3, 3–7, 7+ and young adults (`ages` in `src/data/site-data.json`); the shop shows the Story Walls as ages 3–7 (the 3-5 sheet) and 7+ (the 5-7 sheet); the keys 3-5 and 5-7 stay in SKUs, URLs and file names (`POSTER_AGES` in `server/catalog.js`).
- Both ages use the same picture. For 3-5, every shape is 20% bigger.
- Since 15 Oct 2026 the colouring books are hidden (`BOOKS_HIDDEN` in `server/catalog.js`): /books and the series pages show only the Story Walls, the book pages are not built, and the checkout refuses a book. The organisation packs still include books. Set it to false when the books are ready.

**Style (John chose "J" after 10 tests):**
- Pure, dense black line art that fills the sheet edge to edge, with no shading.
- Funny, tall animals with big round eyes, long whiskers and pink cheeks, and about 30% fewer curves.
- About 15% of the objects are hand-painted (gouache and crayon) as a colour guide.

**Files:**
- `scripts/catalog/story-walls.json`: prompts, palette, and one subject line per series.
- `scripts/catalog/generate_story_walls.py`: stages `line` → `art` (15% painted) → `colour` (fully painted, for the wall photo) → `derive` (3-5 and 5-7 sheets, free) → `photos` (`progress`: colouring on the floor from above; `wall`: framed on a wall).
- `scripts/shop/import-story-walls.mjs`: writes the 4 product pictures (`wall`, `progress`, `art`, `detail`), blur entries and OG images.
- Masters (git-ignored, only on John's Mac): `assets/telning-products/_story-walls/<series>/`
- Photos (git-ignored): `public/products/story-wall/<series>/`
- Earlier tests (git-ignored): `review/tests/sw-*.json` and `review/tests/sw-*/`

**Site changes waiting on the branch:**
- `server/catalog.js`: `VIEWS.poster` is now `['wall','progress','art','detail']`, and the print path points to the new PNG.
- Copy updated to "about 15% painted" and "unroll it on the floor": `shop.json`, `ProductPage.astro`, `materials.astro`, `books/index.astro`, `shop-seo.js`, `emails/templates.mjs`.
- `shop-books.json`: new "The picture" text for each series (DRAFT).
- Tests: a Story Wall page has 4 thumbnails; the print path test is updated.

**Status when this chat ended:**
- Done:
  - 12 line drawings (the letters in 3 of them were removed).
  - 6 printed versions: paws-claws, home-hearts, star-hoppers, little-gardeners, big-days, funny-pages. Their 3-5 and 5-7 sheets are derived.
- Still to make (about 66 images):
  - 6 printed versions: toy-box, little-kitchen, round-the-year, game-on, everyday-heroes, on-the-move
  - 12 fully painted versions
  - 48 photos
- Blocked by:
  - The daily limit: 250 images a day for `gemini-3-pro-image`, resetting about 24 h after the first image of the day.
  - The credits ran out (402). John adds credits at https://ai.studio/projects.

## How to continue

```bash
git checkout story-walls-v2
git merge main
pip3 install --user google-genai Pillow
python3 scripts/catalog/generate_story_walls.py --dry-run
python3 scripts/catalog/generate_story_walls.py --workers 4
```

- Files that already exist are skipped. The run stops by itself on 402 (no credits) or on the daily limit.
- To redo one series: `--series toy-box --force` (add `--stage photos` to redo only its photos).
- Check every picture before importing:
  - no letters, numbers or words (signs, shirts and books must be blank)
  - no faces in the photos (hands only)
  - the poster in the photo is the same picture as the print
  - no white margin on the printed sheet
- Then:

```bash
node scripts/shop/import-story-walls.mjs
npm run emails:build
npm run build
npm run test:privacy
npx playwright test
```

- Take screenshots of a few Story Wall pages (for example `/books/paws-claws/story-wall-3-5`), `/books` and a series page, at 375 and 1280 px. Show John.
- After John's OK: merge `story-walls-v2` into `main` and push.

## Open items (not urgent)

- **Print files:** the Story Wall files are about 128 ppi at 100 cm (3-5 about 106 ppi). Vectorise or upscale them before ordering from the printer.
- **Tote print files:** some carry a background (oatmeal on the undyed totes, a grey frame on ghost-pup, white bands on cat-choir). Cut the drawing out before ordering.
- **Gelato envelopes:** the help page says 145 g recycled, the product page says 150 g feltmark. Use what John's Gelato order screen shows.
- **Organisations page:** the pack photo still shows an old tote.
- **API key:** it was pasted in chat once. John should rotate it in AI Studio and update `.env.local`.
- **Back up:** `assets/telning-products/` exists only on John's Mac (print files for gifts and Story Walls).
