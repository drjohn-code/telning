// The giant colouring poster sheet: 70 × 100 cm (units: mm). The scene, a title ribbon with hollow letters to
// colour, and a quiet imprint line. Ages 3–5: big shapes, thick lines; ages 5–7: small shapes, more detail.
import { r } from './svg.mjs';

export const POSTER = { W: 700, H: 1000 };
export const LINE = { '3-5': 3.6, '5-7': 2.1 };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** A smooth wavy line across [x0, x1] around y with amplitude a; returns a closed shape down to `bottom`. */
export function hill(rand, { x0 = -10, x1 = 710, y, a = 30, n = 4, bottom = 1010, phase = 0 }) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push([x, y + Math.sin(i * 1.7 + phase) * a * 0.6 + (rand() - 0.5) * a]);
  }
  let d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`;
  }
  d += `V${bottom}H${x0}Z`;
  return { d, top: Math.min(...pts.map((p) => p[1])), pts };
}

/** y of the wavy line at x (linear between the control points; close enough for placing objects on it). */
export function yAt(h, x) {
  const p = h.pts;
  for (let i = 0; i < p.length - 1; i++) if (x >= p[i][0] && x <= p[i + 1][0]) {
    const t = (x - p[i][0]) / (p[i + 1][0] - p[i][0]);
    return p[i][1] + (p[i + 1][1] - p[i][1]) * t;
  }
  return p[p.length - 1][1];
}

/** Title ribbon with hollow letters, plus the imprint line. */
export function ribbon({ title, age, lw, W = 700, y = 872, colour = '#F6D27E' }) {
  const fs = age === '3-5' ? 50 : 44;
  const tw = title.length * fs * 0.56 + 86;
  const x0 = (W - tw) / 2, x1 = x0 + tw, h = fs * 1.35, t = 44;
  const tail = (x, dir) => `M${r(x)} ${r(y + 16)}h${dir * t}l${-dir * 16} ${r(h / 2)} ${dir * 16} ${r(h / 2)}h${-dir * t}z`;
  const ink = '#16140F';
  return `<g stroke="${ink}" stroke-width="${lw}" stroke-linejoin="round">
<path d="${tail(x0, -1)}" fill="${colour}"/><path d="${tail(x1, 1)}" fill="${colour}"/>
<path d="M${r(x0)} ${r(y + 16)}l14 -16v${r(h)}l-14 16z" fill="#E8B23A"/><path d="M${r(x1)} ${r(y + 16)}l-14 -16v${r(h)}l14 16z" fill="#E8B23A"/>
<rect x="${r(x0 + 14)}" y="${y}" width="${r(tw - 28)}" height="${r(h)}" rx="4" fill="#FFFFFF"/></g>
<text x="${W / 2}" y="${r(y + h * 0.7)}" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="${fs}" fill="${ink}">${esc(title)}</text>`;
}

export function imprint({ text, W = 700, y = 988 }) {
  // colophon (the open book that forms a T), then the line
  const s = 0.13;
  return `<g transform="translate(${W / 2 - 150} ${y - 15}) scale(${s})"><path fill="#CE4029" d="M22 0H78A22 22 0 0 1 100 22V108A22 22 0 0 1 78 130H22A22 22 0 0 1 0 108V22A22 22 0 0 1 22 0Z"/><path fill="#FFFDF8" d="M50 50C60 40 74 37 86 40L85 56C73 53 60 56 54.5 61V101.5A4.5 4.5 0 0 1 45.5 101.5V61C40 56 27 53 15 56L14 40C26 37 40 40 50 50Z"/></g>
<text x="${W / 2 - 134}" y="${y}" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="8.6" letter-spacing="1.4" fill="#4A453D">${esc(text.toUpperCase())}</text>`;
}

export function posterSvg({ inner, title, age, lw, series }) {
  const { W, H } = POSTER;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">
<rect width="${W}" height="${H}" fill="#FFFFFF"/>
${inner}
${ribbon({ title, age, lw })}
${imprint({ text: `Telning Publishing House · ${series} · Giant colouring poster · Ages ${age.replace('-', '–')}` })}
</svg>`;
}
