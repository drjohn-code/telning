// Product photos for the shop: renders the real print art, places it in the photo scenes with code and writes
// AVIF + WebP at 600 and 1200 px (Story Wall art also 2000 px) to public/shop/img/<slug>/<slug>-<view>-<w>.<ext>,
// plus a tiny blur placeholder per image in src/data/shop-images.json and the Open Graph images (public/og/p/<sku>.jpg
// and the collection pages). EXIF is never written (sharp strips metadata by default). Run after art changes:
//   node scripts/shop/build-photos.mjs [all|books|walls|gifts|packs|og] [series-or-sku …]
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { S, buildCover, buildGifts } from './build-art.mjs';
import { openStudio, buildWall } from './build-walls.mjs';
import { ROOT } from './lib/svg.mjs';
import { page } from './lib/render.mjs';
import * as PH from './lib/photos.mjs';
import { postcardBack } from './lib/giftart.mjs';
import { catalog, site, shop } from '../../server/catalog-data.js';
import { money, imageSlug } from '../../server/catalog.js';
import gifts from '../../src/data/shop-gifts.json' with { type: 'json' };

const [what = 'all', ...only] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const OUT = join(ROOT, 'public/shop/img');
const META = join(ROOT, 'src/data/shop-images.json');
const meta = existsSync(META) ? JSON.parse(readFileSync(META, 'utf8')) : {};
await openStudio(S);
const uri = PH.dataUri;
const art = (svg, w, h, transparent = false) => S.shoot(page(svg, { width: w, height: h, background: transparent ? 'transparent' : '#fff' }), { width: w, height: h, omitBackground: transparent });
const shot = (h) => S.shoot(h, { width: 1200, height: 1200 });
const want = (key) => !only.length || only.some((o) => key.includes(o));
const firstPhoto = {};

/** Save one photo: AVIF + WebP at the widths, and the blur placeholder. */
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
const slugOf = (p) => imageSlug(p.type === 'pack' ? { type: 'pack', key: p.pack.key } : p.type === 'book' || p.type === 'poster' ? { type: p.type, series: p.series, age: p.age } : { type: p.type, key: p.design.key });

async function books() {
  for (const s of site.series) for (const age of ['3-5', '5-7']) {
    const p = catalog.bySku.get(`book-${s.key}-${age}`); const slug = slugOf(p);
    if (!want(p.sku)) continue;
    const { front, back, guide, drawing, last } = await buildCover(s.key, age);
    const F = uri(await art(front, 1200, 1200)), B = uri(await art(back, 1200, 1200));
    const G = uri(await art(guide, 1000, 1000)), D = uri(await art(drawing, 1000, 1000)), L = uri(await art(last, 1000, 1000));
    const hero = await shot(PH.bookTable(F));
    await save(slug, 'table', hero); firstPhoto[p.sku] = hero;
    await save(slug, 'cover', await shot(PH.clean(F, { w: 820 })));
    await save(slug, 'spread', await shot(PH.bookOpen(G, D)));
    await save(slug, 'last-page', await shot(PH.bookOpen(D, L, { crayonOn: true })));
    await save(slug, 'back', await shot(PH.clean(B, { w: 820 })));
    console.log(`photos ${slug}`);
  }
}

async function walls() {
  for (const s of site.series) for (const age of ['3-5', '5-7']) {
    const p = catalog.bySku.get(`poster-${s.key}-${age}`); const slug = slugOf(p);
    if (!want(p.sku)) continue;
    const w = await buildWall(s.key, age);
    const big = await art(w.svg, 2000, 1400);
    mkdirSync(join(OUT, slug), { recursive: true });
    await sharp(big).webp({ quality: 82 }).toFile(join(OUT, slug, `${slug}-art-2000.webp`));
    await sharp(big).avif({ quality: 55, effort: 3 }).toFile(join(OUT, slug, `${slug}-art-2000.avif`));
    const fin = uri(await art(w.finished, 1520, 1064));
    const hero = await shot(PH.wallRoom(fin));
    await save(slug, 'wall', hero); firstPhoto[p.sku] = hero;
    const prog = await art(w.progress, 2000, 1400);
    await save(slug, 'progress', await shot(PH.wallProgress(uri(prog))));
    const crop = uri(await sharp(prog).extract(age === '3-5' ? { left: 500, top: 560, width: 820, height: 820 } : { left: 560, top: 620, width: 720, height: 720 }).resize(1300).png().toBuffer());
    await save(slug, 'detail', await shot(PH.wallDetail(crop)));
    await save(slug, 'scale', await shot(PH.wallScale(fin)));
    await save(slug, 'art', await shot(PH.clean(uri(await sharp(big).resize(1000).png().toBuffer()), { w: 1000, h: 700 })));
    console.log(`photos ${slug}`);
  }
}

async function giftPhotos() {
  const all = await buildGifts();
  const coverFor = async (series) => uri(await art((await buildCover(series || 'star-hoppers', '3-5')).front, 900, 900));
  const pagesFor = async (series) => { const c = await buildCover(series || 'star-hoppers', '3-5'); return [uri(await art(c.guide, 800, 800)), uri(await art(c.drawing, 800, 800))]; };
  for (const d of gifts.mug) {
    const p = catalog.bySku.get(`mug-${d.key}`); const slug = slugOf(p);
    if (!want(p.sku)) continue;
    const W = uri(await art(all[p.sku].wrap, 2400, 933));
    const hero = await shot(PH.mugBreakfast(W, await pagesFor(d.story), { side: 57.15, handle: 'right' }));
    await save(slug, 'breakfast', hero); firstPhoto[p.sku] = hero;
    await save(slug, 'white', await shot(PH.mugClean(W, { side: 57.15, handle: 'right' })));
    await save(slug, 'colour', await shot(PH.mugClean(W, { side: 57.15, handle: 'right', inside: d.insideHex, tilt: 0.24, top: 360 })));
    await save(slug, 'detail', await shot(PH.mugDetail(W, { side: 57.15, handle: 'right' })));
    await save(slug, 'scale', await shot(PH.mugScale(W, await coverFor(d.story), { side: 171.45, handle: 'left' })));
    console.log(`photos ${slug}`);
  }
  for (const d of gifts.tote) {
    const p = catalog.bySku.get(`tote-${d.key}`); const slug = slugOf(p);
    if (!want(p.sku)) continue;
    const Nn = uri(await art(all[p.sku].natural, 1600, 1600, true)), B = uri(await art(all[p.sku].black, 1600, 1600, true));
    const hero = await shot(PH.toteHook(Nn, await coverFor(d.story), 'natural'));
    await save(slug, 'hook', hero); firstPhoto[p.sku] = hero;
    await save(slug, 'natural', await shot(PH.toteClean(Nn, 'natural')));
    await save(slug, 'black', await shot(PH.toteClean(B, 'black')));
    await save(slug, 'detail', await shot(PH.toteDetail(Nn)));
    await save(slug, 'bench', await shot(PH.toteBench(B, 'black')));
    console.log(`photos ${slug}`);
  }
  for (const d of gifts.postcards) {
    const p = catalog.bySku.get(`postcards-${d.key}`); const slug = slugOf(p);
    if (!want(p.sku)) continue;
    const F = uri(await art(all[p.sku].front, 1200, 865)), B = uri(await art(all[p.sku].back, 1200, 865));
    const BW = uri(await art(postcardBack(d.key, d.name, { written: true }), 1200, 865));
    const hero = await shot(PH.postcardDesk(F, BW));
    await save(slug, 'desk', hero); firstPhoto[p.sku] = hero;
    await save(slug, 'front', await shot(PH.flatCard(F, { w: 940, h: 678, radius: 30 })));
    await save(slug, 'back', await shot(PH.flatCard(BW, { w: 940, h: 678, radius: 30 })));
    await save(slug, 'pack', await shot(PH.postcardPack(F)));
    await save(slug, 'detail', await shot(PH.paperDetail(F)));
    console.log(`photos ${slug}`);
  }
  for (const d of gifts.cards) {
    const p = catalog.bySku.get(`cards-${d.key}`); const slug = slugOf(p);
    if (!want(p.sku)) continue;
    const F = uri(await art(all[p.sku].front, 1100, 1100));
    const env = ['boo', 'happy-new-year', 'to-the-moon'].includes(d.key) ? '#d9c7a6' : '#f5efe4';
    const hero = await shot(PH.cardFlatlay(F, { env }));
    await save(slug, 'flatlay', hero); firstPhoto[p.sku] = hero;
    await save(slug, 'front', await shot(PH.cardFold(F)));
    await save(slug, 'open', await shot(PH.cardOpen()));
    await save(slug, 'pack', await shot(PH.cardPack(F, { env })));
    await save(slug, 'detail', await shot(PH.paperDetail(F)));
    console.log(`photos ${slug}`);
  }
}

async function packPhotos() {
  const all = await buildGifts();
  const tote = uri(await art(all['tote-library-day'].natural, 1200, 1200, true));
  const keys = ['star-hoppers', 'paws-claws', 'home-hearts', 'little-gardeners', 'on-the-move'];
  const covers = [];
  for (const k of keys) covers.push(uri(await art((await buildCover(k, '3-5')).front, 800, 800)));
  for (const [key, n] of [['circle', 1], ['classroom', 3], ['library', 5]]) {
    const list = n === 1 ? [covers[0], covers[0], covers[0]] : covers.slice(0, Math.max(3, n));
    await save(`story-${key}-pack`, 'pack', await shot(PH.packPhoto(list, tote, Math.min(4, list.length))));
    console.log(`photos story-${key}-pack`);
  }
}

/* Open Graph images: products (from their first photo) and the collection pages */
async function ogImages() {
  const dir = join(ROOT, 'public/og');
  mkdirSync(join(dir, 'p'), { recursive: true });
  const jpg = async (html, file) => { const png = await S.shoot(html, { width: 1200, height: 630 }); await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toFile(join(dir, file)); };
  const photoOf = async (src) => uri(await sharp(join(ROOT, 'public', `${src}-1200.webp`)).png().toBuffer());
  for (const p of catalog.products) {
    if (!want(p.sku)) continue;
    const kicker = p.category === 'books' ? `${p.seriesName} · Ages ${p.age.replace('-', '–')}` : shop.types[p.type].plural;
    const pr = (p.variants ? p.variants[0].price : p.price).EUR;
    await jpg(PH.og(await photoOf(p.images[0].src), { kicker, title: p.name, price: money(pr, 'EUR', 'en-IE') }), `p/${p.sku}.jpg`);
  }
  const img = (sku, view) => { const p = catalog.bySku.get(sku); return p.images.find((i) => i.view === view).src; };
  const coll = [
    ['books.jpg', 'Telning Publishing House', 'Books & posters', img('book-star-hoppers-3-5', 'table')],
    ['gifts.jpg', 'Telning Publishing House', 'Gifts that keep the story going', img('mug-the-moon', 'breakfast')],
    ['organisations.jpg', 'For kindergartens, schools, libraries', 'Story packs for groups', img('poster-paws-claws-3-5', 'wall')],
    ['materials.jpg', 'Telning Publishing House', 'Our materials', img('tote-library-day', 'detail')],
    ['shipping-returns.jpg', 'Telning Publishing House', 'Shipping & returns', img('postcards-hello-grandma', 'desk')],
    ...site.series.map((s) => [`books-${s.key}.jpg`, `Series · ${s.theme}`, `${s.name}: books and Story Walls`, img(`poster-${s.key}-5-7`, 'wall')]),
    ...['mug', 'tote', 'postcards', 'cards'].map((t) => [`gifts-${t}.jpg`, 'Gifts', shop.types[t].plural, { mug: img('mug-the-garden', 'breakfast'), tote: img('tote-to-the-moon', 'hook'), postcards: img('postcards-happy-birthday', 'pack'), cards: img('cards-thank-you', 'flatlay') }[t]]),
  ];
  for (const [file, kicker, title, src] of coll) await jpg(PH.og(await photoOf(src), { kicker, title, price: '' }), file);
  console.log('og images');
}

if (what === 'all' && !only.length) { for (const d of ['books', 'posters', 'mugs', 'totes', 'postcards', 'cards'].flatMap(() => [])) rmSync(d); }
if (what === 'all' || what === 'books') await books();
if (what === 'all' || what === 'walls') await walls();
if (what === 'all' || what === 'gifts') await giftPhotos();
if (what === 'all' || what === 'packs') await packPhotos();
if (what === 'all' || what === 'og') await ogImages();
await S.close();
