// Measurements on rendered art: how much of each object's box is filled (for the colour estimate),
// and how much of a finished poster carries colour (not paper white, not ink line).
import sharp from 'sharp';
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, objectNames, loadObject, place } from './svg.mjs';
import { page } from './render.mjs';

const CACHE = join(ROOT, 'review/shop/fill-ratio.json');

export async function fillRatios(studio) {
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  const out = {};
  for (const name of objectNames()) {
    const dir = ['objects', 'animals', 'science', 'pim'].find((d) => existsSync(join(ROOT, 'art', d, `${name}.svg`)));
    const mtime = statSync(join(ROOT, 'art', dir, `${name}.svg`)).mtimeMs;
    if (cache[name] && cache[name].mtime === mtime) { out[name] = cache[name].ratio; continue; }
    const { vb } = loadObject(name);
    const w = 200, h = Math.round((vb[3] / vb[2]) * 200);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#fff"/>${place(name, { x: 0, y: 0, w, mode: 'colour', lw: 0.01 }).svg}</svg>`;
    const png = await studio.shoot(page(svg, { width: w, height: h }), { width: w, height: h });
    const ratio = (await colouredShare(png, { countInk: true }));
    cache[name] = { mtime, ratio };
    out[name] = ratio;
  }
  writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  return out;
}

/** Share of pixels that are colour: not paper white and (unless countInk) not ink. */
export async function colouredShare(png, { countInk = false } = {}) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  const px = info.width * info.height;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const white = r > 236 && g > 236 && b > 236;
    const ink = r < 70 && g < 70 && b < 70;
    if (!white && (countInk || !ink)) n++;
  }
  return n / px;
}
