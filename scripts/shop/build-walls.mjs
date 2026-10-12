// Build the Story Walls: vector masters in art/print/story-walls/<series>-<age>.svg, a finished (all colour) version
// for the wall photo, a half-coloured version for the progress photo, and review PNGs.
//   node scripts/shop/build-walls.mjs [series …] [--review] [--print]   (--print: 300 dpi PNG with 3 mm bleed)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ROOT } from './lib/svg.mjs';
import { Scene } from './lib/scene.mjs';
import { WALL, LINE, wallSvg } from './lib/wall.mjs';
import { studio, page, savePng } from './lib/render.mjs';
import { fillRatios, colouredShare } from './lib/measure.mjs';
import { WALLS } from './scenes/walls.mjs';
import site from '../../src/data/site-data.json' with { type: 'json' };

const MAIN = fileURLToPath(import.meta.url) === resolve(process.argv[1]);
const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));
const TARGET = 0.30;
let S, ratios;
export async function openStudio(s) { S = s || (await studio()); ratios = await fillRatios(S); return S; }

export async function buildWall(key, age) {
  const def = WALLS[key];
  const series = site.series.find((s) => s.key === key).name;
  const seed = [...`${key}${age}wall`].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const wrap = (inner, bleed = false) => wallSvg({ inner, title: def.title, age, series, bleed });
  let best = null;
  for (let k = 0; k < 4; k++) {
    const sc = new Scene({ W: WALL.W, H: WALL.H, lw: LINE[age], seed: seed + k * 101 });
    def[age](sc);
    sc.pickColour(TARGET - 0.02, ratios, { countShare: 0.3, grid: [4, 3] });
    const svg = wrap(sc.svg());
    const png = await S.shoot(page(svg, { width: 500, height: 350, background: '#fff' }), { width: 500, height: 350 });
    const share = await colouredShare(png);
    if (!best || Math.abs(share - TARGET) < Math.abs(best.share - TARGET)) best = { svg, share, sc };
    if (Math.abs(share - TARGET) < 0.025) break;
  }
  best.finished = wrap(best.sc.svg('colour'));
  best.progress = wrap(best.sc.svg('auto', { progress: 0.45 }));
  best.print = wrap(best.sc.svg(), true);
  const dir = join(ROOT, 'art/print/story-walls');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${key}-${age}.svg`), best.print);
  if (args.includes('--review')) savePng(await S.shoot(page(best.svg, { width: 1500, height: 1050, background: '#fff' }), { width: 1500, height: 1050 }), join(ROOT, `review/shop/walls/${key}-${age}.png`));
  if (args.includes('--print')) {
    // 300 dpi with 3 mm bleed: 1006 × 706 mm → 11882 × 8339 px
    const w = Math.round(((WALL.W + 2 * WALL.bleed) / 25.4) * 300), h = Math.round(((WALL.H + 2 * WALL.bleed) / 25.4) * 300);
    const png = await S.shoot(page(best.print, { width: w, height: h, background: '#fff' }), { width: w, height: h });
    await sharp(png).withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toFile(join(dir, `${key}-${age}-print-300dpi.png`));
  }
  console.log(`story wall ${key} ${age}: colour ${(best.share * 100).toFixed(1)}%`);
  return best;
}

if (MAIN) {
  await openStudio();
  for (const key of only.length ? only : Object.keys(WALLS)) for (const age of ['3-5', '5-7']) await buildWall(key, age);
  await S.close();
}
