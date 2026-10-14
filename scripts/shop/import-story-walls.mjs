// Import the Story Walls made by scripts/catalog/generate_story_walls.py into the shop.
// For every series and age whose files exist it writes four pictures to public/shop/img/<slug>/:
//   wall      the finished, framed photo            (public/products/story-wall/<key>/<key>-<age>-wall.webp)
//   progress  colouring together on the floor       (…-progress.webp)
//   art       the whole sheet as printed            (assets/telning-products/_story-walls/<key>/<key>-<age>-print.png), also 2000 px for zoom
//   detail    a close-up of the sheet, free         (cropped from the same print file)
// as AVIF + WebP at 600 and 1200 px, the blur entries in src/data/shop-images.json and the share image
// public/og/p/poster-<key>-<age>.jpg. Old pictures in the folder (from the earlier SVG walls) are removed.
//   node scripts/shop/import-story-walls.mjs [--dry-run]
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/svg.mjs';
import { imageSlug, VIEWS } from '../../server/catalog.js';

const DRY = process.argv.includes('--dry-run');
const OUT = join(ROOT, 'public/shop/img');
const META = join(ROOT, 'src/data/shop-images.json');
const meta = JSON.parse(readFileSync(META, 'utf8'));
const series = JSON.parse(readFileSync(join(ROOT, 'scripts/catalog/story-walls.json'), 'utf8')).series;

async function save(slug, view, input, widths = [600, 1200]) {
  const dir = join(OUT, slug);
  const stem = `${slug}-${view}`;
  for (const w of widths) {
    const base = sharp(input).resize({ width: w });
    await base.clone().webp({ quality: 82, effort: 5 }).toFile(join(dir, `${stem}-${w}.webp`));
    await base.clone().avif({ quality: 52, effort: 3 }).toFile(join(dir, `${stem}-${w}.avif`));
  }
  const { width, height } = await sharp(input).metadata();
  const tiny = await sharp(input).resize({ width: 24 }).blur(1).webp({ quality: 40 }).toBuffer();
  meta[`/shop/img/${slug}/${stem}`] = { w: 1200, h: Math.round((1200 * height) / width), b: `data:image/webp;base64,${tiny.toString('base64')}` };
}

let done = 0, waiting = 0;
for (const key of Object.keys(series)) {
  for (const age of ['3-5', '5-7']) {
    const photo = (v) => join(ROOT, 'public/products/story-wall', key, `${key}-${age}-${v}.webp`);
    const print = join(ROOT, 'assets/telning-products/_story-walls', key, `${key}-${age}-print.png`);
    if (![photo('wall'), photo('progress'), print].every(existsSync)) { waiting++; continue; }
    const slug = imageSlug({ type: 'poster', series: key, age });
    if (!DRY) {
      const dir = join(OUT, slug);
      mkdirSync(dir, { recursive: true });
      for (const f of readdirSync(dir)) rmSync(join(dir, f));
      for (const k of Object.keys(meta)) if (k.startsWith(`/shop/img/${slug}/`)) delete meta[k];
      await save(slug, 'wall', photo('wall'));
      await save(slug, 'progress', photo('progress'));
      await save(slug, 'art', print, [600, 1200, 2000]);
      // close-up: a square from the left middle of the sheet, a third of its height, so the line size shows
      const { width: W, height: H } = await sharp(print).metadata();
      const side = Math.round(H / 3);
      const crop = await sharp(print).extract({ left: Math.round(W * 0.18), top: Math.round(H * 0.38), width: side, height: side }).toBuffer();
      await save(slug, 'detail', crop);
      const og = await sharp(photo('wall')).resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      writeFileSync(join(ROOT, 'public/og/p', `poster-${key}-${age}.jpg`), og);
    }
    done++;
    console.log(`${DRY ? 'would import' : 'imported'} poster-${key}-${age} (${VIEWS.poster.join(', ')})`);
  }
}
if (!DRY) writeFileSync(META, JSON.stringify(meta));
console.log(`${done} Story Wall(s) ${DRY ? 'ready' : 'imported'}, ${waiting} still waiting for pictures`);
