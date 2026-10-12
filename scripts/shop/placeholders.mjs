// Placeholder pictures for products that have no photos yet (design.placeholder in shop-gifts.json) and for the
// Halloween gift-set picture on /gifts: a calm paper card with the name and "Photo coming soon", in the site fonts.
// Writes AVIF + WebP at 600 and 1200 px to public/shop/img/<slug>/<slug>-placeholder-<w>.<ext> and the blur entry in
// src/data/shop-images.json, like build-photos, and the share image public/og/p/<sku>.jpg. Re-run `npm run photos` (or the real mockups) to replace them.
//   node scripts/shop/placeholders.mjs
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/svg.mjs';
import { studio, TOKENS_CSS } from './lib/render.mjs';
import { catalog, shop } from '../../server/catalog-data.js';
import { imageSlug } from '../../server/catalog.js';

const OUT = join(ROOT, 'public/shop/img');
const META = join(ROOT, 'src/data/shop-images.json');
const meta = existsSync(META) ? JSON.parse(readFileSync(META, 'utf8')) : {};
const S = await studio();

async function save(slug, view, png, widths = [600, 1200]) {
  const dir = join(OUT, slug);
  mkdirSync(dir, { recursive: true });
  const stem = `${slug}-${view}`;
  for (const w of widths) {
    const base = sharp(png).resize({ width: w });
    await base.clone().webp({ quality: 80, effort: 5 }).toFile(join(dir, `${stem}-${w}.webp`));
    await base.clone().avif({ quality: 52, effort: 3 }).toFile(join(dir, `${stem}-${w}.avif`));
  }
  const tiny = await sharp(png).resize({ width: 24 }).blur(1).webp({ quality: 40 }).toBuffer();
  const info = await sharp(png).metadata();
  meta[`/shop/img/${slug}/${stem}`] = { w: info.width, h: info.height, b: `data:image/webp;base64,${tiny.toString('base64')}` };
  writeFileSync(META, JSON.stringify(meta));
}

const pumpkin = `<svg viewBox="0 0 120 100" width="120" height="100" aria-hidden="true"><path d="M58 22c-2-8 2-14 8-16 2 6 0 11-3 16z" fill="var(--forest-light)"/><ellipse cx="60" cy="62" rx="44" ry="34" fill="var(--gold-deep)"/><ellipse cx="60" cy="62" rx="26" ry="34" fill="var(--gold)"/><ellipse cx="60" cy="62" rx="10" ry="34" fill="var(--gold-deep)" opacity=".5"/></svg>`;
const card = ({ kicker, title, line }) => `<!doctype html><html><head><meta charset="utf-8"><style>${TOKENS_CSS}
html,body{margin:0}body{width:1200px;height:1200px;background:var(--paper);font-family:var(--font-text);color:var(--ink);display:grid;place-items:center}
.c{width:880px;padding:72px 80px;box-sizing:border-box;background:var(--cream);border-radius:40px;box-shadow:0 2px 4px rgba(22,20,15,.08),0 24px 50px rgba(22,20,15,.12);display:grid;gap:28px;justify-items:center;text-align:center}
.k{font-weight:600;font-size:22px;letter-spacing:.18em;text-transform:uppercase;color:var(--red-deep)}
h1{margin:0;font-family:var(--font-display);font-weight:600;font-size:64px;line-height:1.05;letter-spacing:-.015em;text-wrap:balance}
p{margin:0;font-size:28px;line-height:1.4;max-width:620px;color:var(--ink-soft)}
.s{display:inline-flex;align-items:center;gap:10px;margin-top:8px;padding:14px 26px;border-radius:999px;background:var(--paper-deep);font-weight:600;font-size:24px}
</style></head><body><div class="c">${pumpkin}<span class="k">${kicker}</span><h1>${title}</h1><p>${line}</p><span class="s">Photo coming soon</span></div></body></html>`;

let n = 0;
for (const p of catalog.products) {
  if (!p.soon) continue;
  const slug = imageSlug({ type: p.type, key: p.design.key, pim: false });
  const kicker = `${shop.types[p.type].tile}${p.colourName ? ` · ${p.colourName}` : ''} · Halloween`;
  const png = await S.shoot(card({ kicker, title: p.title, line: p.design.line || p.design.about }), { width: 1200, height: 1200 });
  await save(slug, 'placeholder', png);
  const og = await S.shoot(card({ kicker, title: p.title, line: p.design.line || p.design.about }).replace('height:1200px', 'height:630px').replace('width:880px;padding:72px 80px', 'width:880px;padding:40px 80px'), { width: 1200, height: 630 });
  mkdirSync(join(ROOT, 'public/og/p'), { recursive: true });
  await sharp(og).jpeg({ quality: 82, mozjpeg: true }).toFile(join(ROOT, 'public/og/p', `${p.sku}.jpg`));
  n++;
}
const set = await S.shoot(card({ kicker: 'Gifts · Halloween', title: 'The Halloween gift set', line: 'A mug, a tote bag, a postcard and a greeting card, with our cats and dogs.' }), { width: 1200, height: 1200 });
await save('gift-set', 'halloween-gift-set', set);
await S.close();
console.log(`placeholders: ${n} products + the gift set`);
