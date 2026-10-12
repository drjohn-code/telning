// Build the shop's print art (vector masters in art/print/) and review renders.
// node scripts/shop/build-art.mjs posters [series ...] [--review]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './lib/svg.mjs';
import { Scene } from './lib/scene.mjs';
import { POSTER, LINE, posterSvg } from './lib/poster.mjs';
import { studio, page, savePng } from './lib/render.mjs';
import { fillRatios, colouredShare } from './lib/measure.mjs';
import { POSTERS } from './scenes/posters.mjs';
import { COVERS } from './scenes/covers.mjs';
import { frontCover, backCover, spread, guidePage, drawingPage, lastPage, COVER } from './lib/cover.mjs';
import { cardFront, cardBack, cardInside, postcardFront, postcardBack, mugWrap, totePrint, CARD, PC, MUG, TOTE } from './lib/giftart.mjs';
import gifts from '../../src/data/shop-gifts.json' with { type: 'json' };
import site from '../../src/data/site-data.json' with { type: 'json' };
import books from '../../src/data/shop-books.json' with { type: 'json' };

const [what = 'posters', ...rest] = process.argv.slice(2);
const MAIN = fileURLToPath(import.meta.url) === resolve(process.argv[1]);
const only = rest.filter((a) => !a.startsWith('--'));
export const S = await studio();
const ratios = await fillRatios(S);
const TARGET = 0.30;

export async function buildPoster(key, age) {
  const def = POSTERS[key];
  const seed = [...`${key}${age}`].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const series = site.series.find((s) => s.key === key).name;
  const wrap = (inner) => posterSvg({ inner, title: def.title, age, lw: LINE[age], series });
  let best = null;
  // try a few seeds of the colour choice and keep the one closest to the target
  for (let k = 0; k < 4; k++) {
    const sc = new Scene({ W: POSTER.W, H: POSTER.H, lw: LINE[age], seed: seed + k * 101 });
    def[age](sc);
    sc.pickColour(TARGET - 0.02, ratios);
    const svg = wrap(sc.svg());
    const png = await S.shoot(page(svg, { width: 350, height: 500, background: '#fff' }), { width: 350, height: 500 });
    const share = await colouredShare(png);
    if (!best || Math.abs(share - TARGET) < Math.abs(best.share - TARGET)) best = { svg, share, sc };
    if (Math.abs(share - TARGET) < 0.025) break;
  }
  best.finished = wrap(best.sc.svg('colour'));
  best.progress = wrap(best.sc.svg('auto', { progress: 0.42 }));
  const dir = join(ROOT, 'art/print/posters');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${key}-${age}.svg`), best.svg);
  if (process.argv.includes('--review')) {
    const png = await S.shoot(page(best.svg, { width: 1050, height: 1500, background: '#fff' }), { width: 1050, height: 1500 });
    savePng(png, join(ROOT, `review/shop/posters/${key}-${age}.png`));
  }
  console.log(`poster ${key} ${age}: colour ${(best.share * 100).toFixed(1)}%`);
  return best;
}

export async function buildCover(key, age) {
  const s = site.series.find((x) => x.key === key);
  const b = books.series[key].books[age];
  const seed = [...`${key}${age}cover`].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const front = frontCover({ seriesName: s.name, title: b.title, age, kit: COVERS[key], seed });
  const back = backCover({ seriesName: s.name, title: b.title, age, hook: b.hook });
  const guide = guidePage({ question: b.talk[0], word: b.talk[1] });
  const drawing = drawingPage({ kit: COVERS[key], seed: seed + 5 });
  const last = lastPage({});
  const dir = join(ROOT, 'art/print/books');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${key}-${age}-front.svg`), front);
  writeFileSync(join(dir, `${key}-${age}-back.svg`), back);
  writeFileSync(join(dir, `${key}-${age}-cover.svg`), spread({ front, back }));
  if (process.argv.includes('--review')) for (const [n, svg] of [['front', front], ['back', back]]) {
    const png = await S.shoot(page(svg, { width: 900, height: 900 }), { width: 900, height: 900 });
    savePng(png, join(ROOT, `review/shop/covers/${key}-${age}-${n}.png`));
  }
  console.log(`cover ${key} ${age}`);
  return { front, back, guide, drawing, last };
}

/** Gift print files (art/print/<type>/…) and one review sheet per gift type. */
export async function buildGifts() {
  const out = {};
  const save = (dir, name, svg) => { mkdirSync(join(ROOT, 'art/print', dir), { recursive: true }); writeFileSync(join(ROOT, 'art/print', dir, name), svg); return svg; };
  for (const d of gifts.cards) out[`cards-${d.key}`] = { front: save('greeting-cards', `${d.key}.svg`, cardFront(d.key)), back: save('greeting-cards', `${d.key}-back.svg`, cardBack(d.key, d.name)), inside: cardInside() };
  for (const d of gifts.postcards) out[`postcards-${d.key}`] = { front: save('postcards', `${d.key}.svg`, postcardFront(d.key)), back: save('postcards', `${d.key}-back.svg`, postcardBack(d.key, d.name)) };
  for (const d of gifts.mug) out[`mug-${d.key}`] = { wrap: save('mugs', `${d.key}.svg`, mugWrap(d.key, d.words)) };
  for (const d of gifts.tote) out[`tote-${d.key}`] = { natural: save('tote-bags', `${d.key}.svg`, totePrint(d.key, d.words, 'natural')), black: save('tote-bags', `${d.key}-black.svg`, totePrint(d.key, d.words, 'black')) };
  // review sheets
  const sheet = async (name, items, w, h, cols) => {
    const rows = Math.ceil(items.length / cols);
    const html = `<div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:12px;padding:12px;background:#ccc">${items.map((s) => `<div style="width:${w}px;height:${h}px;background:#fff">${s.replace('<svg ', `<svg style="width:${w}px;height:${h}px;display:block" `)}</div>`).join('')}</div>`;
    const W = cols * (w + 12) + 12, H = rows * (h + 12) + 12;
    savePng(await S.shoot(page(html, { width: W, height: H }), { width: W, height: H }), join(ROOT, `review/shop/gifts/${name}.png`));
  };
  await sheet('cards', gifts.cards.map((d) => out[`cards-${d.key}`].front), 300, 300, 5);
  await sheet('postcards', gifts.postcards.map((d) => out[`postcards-${d.key}`].front).concat([out['postcards-hello-grandma'].back]), 360, 260, 3);
  await sheet('mugs', gifts.mug.map((d) => out[`mug-${d.key}`].wrap), 640, 249, 2);
  await sheet('totes', gifts.tote.flatMap((d) => [out[`tote-${d.key}`].natural.replace('<svg ', '<svg style="background:#efe6d4" '), out[`tote-${d.key}`].black.replace('<svg ', '<svg style="background:#1d1c1a" ')]), 240, 240, 6);
  console.log('gifts: print files and review sheets');
  return out;
}
if (MAIN && what === 'gifts') await buildGifts();

if (MAIN && what === 'covers') {
  for (const key of only.length ? only : Object.keys(COVERS)) for (const age of ['3-5', '5-7']) await buildCover(key, age);
}
if (MAIN && what === 'posters') {
  for (const key of only.length ? only : Object.keys(POSTERS)) for (const age of ['3-5', '5-7']) await buildPoster(key, age);
}
if (MAIN) await S.close();
