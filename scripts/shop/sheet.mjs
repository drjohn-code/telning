// Contact sheet of paper objects in the three modes (flat · colour with outline · line art), for review.
// node scripts/shop/sheet.mjs [name ...] [--out review/shop/sheet.png] [--cols 6]
import { objectNames, place, loadObject } from './lib/svg.mjs';
import { studio, page, savePng } from './lib/render.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const out = opt('--out', 'review/shop/sheet.png');
const cols = Number(opt('--cols', 4));
const names = args.length ? args : objectNames();

const CELL = 120, PAD = 14, LABEL = 18;
const cellW = CELL * 3 + PAD * 4, cellH = CELL + PAD * 2 + LABEL;
const rows = Math.ceil(names.length / cols);
const W = cols * cellW, H = rows * cellH;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#f6f1e8"/>`;
names.forEach((name, i) => {
  const gx = (i % cols) * cellW, gy = Math.floor(i / cols) * cellH;
  const { vb } = loadObject(name);
  const ratio = vb[3] / vb[2];
  const w = ratio > 1 ? CELL / ratio : CELL;
  svg += `<rect x="${gx + 4}" y="${gy + 4}" width="${cellW - 8}" height="${cellH - 8}" rx="10" fill="#fff"/>`;
  ['flat', 'colour', 'line'].forEach((mode, k) => {
    const cx = gx + PAD + k * (CELL + PAD) + CELL / 2;
    svg += place(name, { cx, cy: gy + PAD + CELL / 2, w, mode, lw: 2.2 }).svg;
  });
  svg += `<text x="${gx + PAD}" y="${gy + cellH - 10}" font-family="Instrument Sans, sans-serif" font-size="13" fill="#4a453d">${name}</text>`;
});
svg += '</svg>';

const s = await studio();
const png = await s.shoot(page(svg, { width: W, height: H }), { width: W, height: H });
console.log(savePng(png, out));
await s.close();
