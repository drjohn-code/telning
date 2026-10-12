// The Story Wall sheet: a landscape colouring poster, 100 × 70 cm (units: mm). One story scene per series world,
// about 30 % printed in flat Telning colours and 70 % open line art; a small cream title plate bottom-right and a
// quiet imprint bottom-left. Safe margin 25 mm; the print export adds 3 mm bleed on every side.
import { r } from './svg.mjs';

export const WALL = { W: 1000, H: 700, margin: 25, bleed: 3 };
export const LINE = { '3-5': 2.8, '5-7': 2.2 };   // outline width in mm at print size

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const INK = '#16140F';

/** The title plate: cream rounded card, the series name in Fraunces, one quiet line under it. */
export function titlePlate({ title, age, W = WALL.W, H = WALL.H }) {
  const pw = Math.max(200, title.length * 15 + 60), ph = 58;
  const x = W - WALL.margin - pw, y = H - WALL.margin - ph;
  return `<g>
<rect x="${r(x + 2)}" y="${r(y + 3)}" width="${pw}" height="${ph}" rx="10" fill="${INK}" opacity=".12"/>
<rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="10" fill="#FFFDF8" stroke="${INK}" stroke-width="1.2"/>
<text x="${r(x + pw / 2)}" y="${r(y + 32)}" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="24" letter-spacing="-0.3" fill="${INK}">${esc(title)}</text>
<text x="${r(x + pw / 2)}" y="${r(y + 47)}" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="6.2" letter-spacing="1.6" fill="#4A453D">A TELNING STORY WALL · AGES ${age.replace('-', '–')}</text>
</g>`;
}

export function imprint({ W = WALL.W, H = WALL.H }) {
  const x = WALL.margin, y = H - WALL.margin - 4, s = 0.1;
  return `<rect x="${x - 6}" y="${r(y - 15)}" width="318" height="20" rx="10" fill="#FFFFFF" opacity=".85"/><g transform="translate(${x} ${r(y - 11)}) scale(${s})"><path fill="#CE4029" d="M22 0H78A22 22 0 0 1 100 22V108A22 22 0 0 1 78 130H22A22 22 0 0 1 0 108V22A22 22 0 0 1 22 0Z"/><path fill="#FFFDF8" d="M50 50C60 40 74 37 86 40L85 56C73 53 60 56 54.5 61V101.5A4.5 4.5 0 0 1 45.5 101.5V61C40 56 27 53 15 56L14 40C26 37 40 40 50 50Z"/></g>
<text x="${x + 14}" y="${r(y - 2)}" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="6" letter-spacing="1.2" fill="#4A453D">TELNING PUBLISHING HOUSE · DESIGNED IN SWEDEN · TELNING.COM</text>`;
}

/** The finished sheet. `inner` is the scene; `bleed` adds 3 mm of the scene's own edges around it. */
export function wallSvg({ inner, title, age, series, bleed = false }) {
  const { W, H } = WALL;
  const b = bleed ? WALL.bleed : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-b} ${-b} ${W + 2 * b} ${H + 2 * b}" width="${W + 2 * b}mm" height="${H + 2 * b}mm">
<rect x="${-b}" y="${-b}" width="${W + 2 * b}" height="${H + 2 * b}" fill="#FFFFFF"/>
${inner}
${titlePlate({ title: series || title, age })}
${imprint({})}
</svg>`;
}
