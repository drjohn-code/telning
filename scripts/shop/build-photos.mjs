// Product photos for the shop: renders the art, places it in the photo scenes and writes WebP files to
// public/shop/img/<sku>/<view>-600.webp and -1200.webp (posters' art also -2000), plus Open Graph images
// (public/og/p/<sku>.jpg and the collection pages). Run after art changes, then commit the images:
//   node scripts/shop/build-photos.mjs [all|books|posters|gifts|og] [series-or-sku …]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { S, buildPoster, buildCover, buildGifts } from './build-art.mjs';
import { ROOT } from './lib/svg.mjs';
import { page, saveWebp } from './lib/render.mjs';
import * as PH from './lib/photos.mjs';
import { catalog, site, shop } from '../../server/catalog-data.js';
import { money } from '../../server/catalog.js';
import gifts from '../../src/data/shop-gifts.json' with { type: 'json' };

const [what = 'all', ...only] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const OUT = join(ROOT, 'public/shop/img');
const uri = PH.dataUri;
const art = (svg, w, h, transparent = false) => S.shoot(page(svg, { width: w, height: h, background: transparent ? 'transparent' : '#fff' }), { width: w, height: h, omitBackground: transparent });
const shot = (h) => S.shoot(h, { width: 1200, height: 1200 });
const save = (sku, view, buf, widths = [600, 1200]) => saveWebp(buf, join(OUT, sku, view), widths, { quality: 80 });
const want = (key) => !only.length || only.some((o) => key.includes(o));
const firstPhoto = {};

async function books() {
  for (const s of site.series) for (const age of ['3-5', '5-7']) {
    const sku = `book-${s.key}-${age}`;
    if (!want(sku)) continue;
    const { front, back } = await buildCover(s.key, age);
    const F = uri(await art(front, 1200, 1200)), B = uri(await art(back, 1200, 1200));
    const fp = await shot(PH.bookFront(F));
    await save(sku, 'front', fp); firstPhoto[sku] = fp;
    await save(sku, 'table', await shot(PH.bookTable(F)));
    await save(sku, 'back', await shot(PH.bookBack(B)));
    await save(sku, 'stand', await shot(PH.bookStand(F)));
    console.log(`photos ${sku}`);
  }
}

async function posters() {
  for (const s of site.series) for (const age of ['3-5', '5-7']) {
    const sku = `poster-${s.key}-${age}`;
    if (!want(sku)) continue;
    const p = await buildPoster(s.key, age);
    const big = await art(p.svg, 1400, 2000);
    mkdirSync(join(OUT, sku), { recursive: true });
    await sharp(big).webp({ quality: 82 }).toFile(join(OUT, sku, 'art-2000.webp'));
    const A = uri(await sharp(big).resize(742).png().toBuffer());
    const ap = await shot(PH.posterArt(A));
    await save(sku, 'art', ap); firstPhoto[sku] = ap;
    const fin = uri(await art(p.finished, 700, 1000));
    await save(sku, 'wall', await shot(PH.posterWall(fin)));
    const prog = await art(p.progress, 2100, 3000);
    const crop = uri(await sharp(prog).extract(age === '3-5' ? { left: 250, top: 1150, width: 1600, height: 1550 } : { left: 300, top: 1450, width: 1500, height: 1450 }).resize(1320).png().toBuffer());
    await save(sku, 'detail', await shot(PH.posterDetail(crop)));
    await save(sku, 'tube', await shot(PH.posterTube(uri(await sharp(big).resize(900).png().toBuffer()))));
    console.log(`photos ${sku}`);
  }
}

async function giftPhotos() {
  const all = await buildGifts();
  const coverFor = async (series) => uri(await art((await buildCover(series || 'star-hoppers', '3-5')).front, 900, 900));
  for (const d of gifts.mug) {
    const sku = `mug-${d.key}`;
    if (!want(sku)) continue;
    const W = uri(await art(all[sku].wrap, 2400, 933));
    const wp = await shot(PH.mugStudio(W, { side: 57.15, handle: 'right' }));
    await save(sku, 'white', wp); firstPhoto[sku] = wp;
    await save(sku, 'colour', await shot(PH.mugStudio(W, { side: 57.15, handle: 'right', inside: d.insideHex, tilt: 0.24, top: 360 })));
    await save(sku, 'back', await shot(PH.mugStudio(W, { side: 171.45, handle: 'left' })));
    await save(sku, 'table', await shot(PH.mugTable(W, await coverFor(d.story))));
    console.log(`photos ${sku}`);
  }
  for (const d of gifts.tote) {
    const sku = `tote-${d.key}`;
    if (!want(sku)) continue;
    const N = uri(await art(all[sku].natural, 1600, 1600, true)), B = uri(await art(all[sku].black, 1600, 1600, true));
    const np = await shot(PH.toteStudio(N, 'natural'));
    await save(sku, 'natural', np); firstPhoto[sku] = np;
    await save(sku, 'black', await shot(PH.toteStudio(B, 'black')));
    await save(sku, 'scene', await shot(PH.toteScene(N, await coverFor(d.story))));
    await save(sku, 'detail', await shot(PH.toteDetail(N)));
    console.log(`photos ${sku}`);
  }
  for (const d of gifts.postcards) {
    const sku = `postcards-${d.key}`;
    if (!want(sku)) continue;
    const F = uri(await art(all[sku].front, 1200, 865)), B = uri(await art(all[sku].back, 1200, 865));
    const fp = await shot(PH.flatCard(F, { w: 940, h: 678, radius: 30 }));
    await save(sku, 'front', fp); firstPhoto[sku] = fp;
    await save(sku, 'back', await shot(PH.flatCard(B, { w: 940, h: 678, radius: 30 })));
    await save(sku, 'pack', await shot(PH.postcardPack(F)));
    await save(sku, 'scene', await shot(PH.postcardScene(F, B)));
    console.log(`photos ${sku}`);
  }
  const mugWrap = uri(await art(all['mug-one-more-page'].wrap, 1600, 622));
  for (const d of gifts.cards) {
    const sku = `cards-${d.key}`;
    if (!want(sku)) continue;
    const F = uri(await art(all[sku].front, 1100, 1100));
    const fp = await shot(PH.cardFold(F));
    await save(sku, 'front', fp); firstPhoto[sku] = fp;
    await save(sku, 'open', await shot(PH.cardOpen()));
    await save(sku, 'envelope', await shot(PH.cardEnvelope(F, { env: ['boo', 'happy-new-year', 'to-the-moon'].includes(d.key) ? '#d9c7a6' : '#f5efe4' })));
    await save(sku, 'scene', await shot(PH.cardScene(F, mugWrap)));
    console.log(`photos ${sku}`);
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
    await save(`pack-${key}`, 'pack', await shot(PH.packPhoto(list, tote, Math.min(4, list.length))));
    console.log(`photos pack-${key}`);
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
    const title = p.type === 'book' ? p.title : p.type === 'poster' ? `${p.seriesName} giant colouring poster` : p.name;
    const pr = (p.variants ? p.variants[0].price : p.price).EUR;
    await jpg(PH.og(await photoOf(p.images[0].src), { kicker, title, price: money(pr, 'EUR', 'en-IE') }), `p/${p.sku}.jpg`);
  }
  const coll = [
    ['books.jpg', 'Telning Publishing House', 'Books & posters', '/shop/img/book-star-hoppers-3-5/table'],
    ['gifts.jpg', 'Telning Publishing House', 'Gifts that keep the story going', '/shop/img/mug-the-moon/table'],
    ['organisations.jpg', 'For kindergartens, schools, libraries', 'Story packs for groups', '/shop/img/poster-paws-claws-3-5/wall'],
    ['materials.jpg', 'Telning Publishing House', 'Our materials', '/shop/img/tote-library-day/detail'],
    ['shipping-returns.jpg', 'Telning Publishing House', 'Shipping & returns', '/shop/img/postcards-hello-grandma/scene'],
    ...site.series.map((s) => [`books-${s.key}.jpg`, `Series · ${s.theme}`, `${s.name}: books and posters`, `/shop/img/poster-${s.key}-5-7/wall`]),
    ...['mug', 'tote', 'postcards', 'cards'].map((t) => [`gifts-${t}.jpg`, 'Gifts', shop.types[t].plural, { mug: '/shop/img/mug-the-garden/table', tote: '/shop/img/tote-to-the-moon/scene', postcards: '/shop/img/postcards-happy-birthday/pack', cards: '/shop/img/cards-thank-you/envelope' }[t]]),
  ];
  for (const [file, kicker, title, src] of coll) await jpg(PH.og(await photoOf(src), { kicker, title, price: '' }), file);
  console.log('og images');
}

if (what === 'all' || what === 'books') await books();
if (what === 'all' || what === 'posters') await posters();
if (what === 'all' || what === 'gifts') await giftPhotos();
if (what === 'all' || what === 'packs') await packPhotos();
if (what === 'all' || what === 'og') await ogImages();
await S.close();
