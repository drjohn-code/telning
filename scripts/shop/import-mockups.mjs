// Import the Halloween product photos made by scripts/catalog/generate_mockups.py into the shop.
// For every Halloween design whose three photos exist (public/products/<product>/<theme>/<design>/<…>-<view>.webp,
// views table, home, hand), it writes AVIF + WebP at 600 and 1200 px to public/shop/img/<slug>/<slug>-<view>-<w>.<ext>,
// the blur entry in src/data/shop-images.json and the share image public/og/p/<sku>.jpg, removes the placeholder
// files, and sets `placeholder: false` in src/data/shop-gifts.json (the design leaves "Coming soon").
// The gift-set picture replaces its placeholder in place; the campaign pictures go to /shop/img/campaign (--only campaign).
// Safe to run again: it only does designs with all photos.
//   node scripts/shop/import-mockups.mjs [--dry-run] [--only pumpkin-patch-cats,gift-set]   (--only: just these design keys, or
//   skus like postcards-dog-parade when a key is used by two products)
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/svg.mjs';
import { imageSlug, GIFT_PHOTO_VIEWS } from '../../server/catalog.js';

const DRY = process.argv.includes('--dry-run');
const onlyAt = process.argv.indexOf('--only');
const ONLY = onlyAt > 0 ? new Set((process.argv[onlyAt + 1] || '').split(',').filter(Boolean)) : null;
const wanted = (key) => !ONLY || ONLY.has(key);
const OUT = join(ROOT, 'public/shop/img');
const META = join(ROOT, 'src/data/shop-images.json');
const GIFTS = join(ROOT, 'src/data/shop-gifts.json');
const meta = JSON.parse(readFileSync(META, 'utf8'));
const gifts = JSON.parse(readFileSync(GIFTS, 'utf8'));

async function save(slug, view, file) {
  const dir = join(OUT, slug);
  mkdirSync(dir, { recursive: true });
  const stem = `${slug}-${view}`;
  for (const w of [600, 1200]) {
    const base = sharp(file).resize({ width: w });
    await base.clone().webp({ quality: 80, effort: 5 }).toFile(join(dir, `${stem}-${w}.webp`));
    await base.clone().avif({ quality: 52, effort: 3 }).toFile(join(dir, `${stem}-${w}.avif`));
  }
  const tiny = await sharp(file).resize({ width: 24 }).blur(1).webp({ quality: 40 }).toBuffer();
  meta[`/shop/img/${slug}/${stem}`] = { w: 1200, h: 1200, b: `data:image/webp;base64,${tiny.toString('base64')}` };
}

let done = 0, waiting = 0;
for (const type of ['mug', 'tote', 'postcards', 'cards']) {
  for (const d of gifts[type]) {
    if (!d.animal || !d.prompt || !(wanted(d.key) || wanted(`${type}-${d.key}`))) continue;
    const [theme, product, design] = d.prompt.split('/');          // e.g. halloween/tote-black/cat
    const src = (view) => join(ROOT, 'public/products', product, theme, design, `${theme}-${design}-${product}-${view}.webp`);
    if (!GIFT_PHOTO_VIEWS.every((v) => existsSync(src(v)))) { waiting++; continue; }
    const slug = imageSlug({ type, key: d.key, pim: false });
    if (!DRY) {
      for (const v of GIFT_PHOTO_VIEWS) await save(slug, v, src(v));
      for (const f of existsSync(join(OUT, slug)) ? readdirSync(join(OUT, slug)) : []) if (f.includes('-placeholder-')) rmSync(join(OUT, slug, f));
      delete meta[`/shop/img/${slug}/${slug}-placeholder`];
      const og = await sharp(src('table')).resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      mkdirSync(join(ROOT, 'public/og/p'), { recursive: true });
      writeFileSync(join(ROOT, 'public/og/p', `${type}-${d.key}.jpg`), og);
      d.placeholder = false;
    }
    done++;
    console.log(`${DRY ? 'would import' : 'imported'} ${type}-${d.key}`);
  }
}
const set = join(ROOT, 'public/products/gift-set/halloween/halloween-gift-set.webp');
if (existsSync(set) && wanted('gift-set')) { if (!DRY) await save('gift-set', 'halloween-gift-set', set); console.log(`${DRY ? 'would import' : 'imported'} the gift set`); }
// the campaign pictures (John, 16 Oct 2026): one landscape room scene per offer page (generate_mockups.py --stage campaign)
// → /shop/img/campaign/campaign-<key>-scene-<w>.{avif,webp} with its real height, and the share image public/og/campaign-<key>.jpg
const CAMP = join(ROOT, 'public/products/campaign');
for (const f of existsSync(CAMP) ? readdirSync(CAMP).filter((x) => x.endsWith('-campaign-scene.webp')) : []) {
  const key = f.replace('-campaign-scene.webp', '');
  if (!wanted('campaign') && !wanted(`campaign-${key}`)) continue;
  const file = join(CAMP, f);
  if (!DRY) {
    await save('campaign', `${key}-scene`, file);
    const { width, height } = await sharp(file).metadata();
    meta[`/shop/img/campaign/campaign-${key}-scene`].h = Math.round(1200 * height / width);
    // the share picture: 1200 × 630 with the whole scene (a crop would cut the table), centred on the site's paper colour
    const og = await sharp(file).resize(1200, 630, { fit: 'contain', background: '#f6f1e8' }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    writeFileSync(join(ROOT, 'public/og', `campaign-${key}.jpg`), og);
  }
  console.log(`${DRY ? 'would import' : 'imported'} the ${key} campaign picture`);
}
if (!DRY) { writeFileSync(META, JSON.stringify(meta)); writeFileSync(GIFTS, JSON.stringify(gifts, null, 2) + '\n'); }
console.log(`${done} design(s) ${DRY ? 'ready' : 'imported'}, ${waiting} still waiting for photos`);
