// The book cover: 8.5 × 8.5 in with 0.125 in bleed = 222.25 mm square. Matte, Telning green edge to edge, one system
// for all twelve series: logo top-left, age badge top-right, the series name, the title in Fraunces, a rounded
// picture window in the series accent colour with the hero scene in flat colour, and Pim in front of the window
// on every cover. The spine stays plain green. Back: tagline, the blurb in six languages, badges, the QR code.
// Inside pages (for the honest product photos): a conversation-guide page, a line-art drawing page, the empty last page.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, TOK, r, place } from './svg.mjs';
import { Scene } from './scene.mjs';
import { qrSvg } from './qr.mjs';
import { hill, yAt } from './poster.mjs';

export const COVER = { W: 222.25, H: 222.25, bleed: 3.175 };
export const PAGE = { W: 215.9, H: 215.9 };
export const GREEN = '#1E4A3B';
const CREAM = TOK.cream, GOLDL = TOK['gold-light'], INK = TOK.ink;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const FR = 'Fraunces, Georgia, serif', IS = 'Instrument Sans, sans-serif';

const lockupSrc = readFileSync(join(ROOT, 'art/logo/lockup.svg'), 'utf8');
/** The logo lockup at (x, y), height h, wordmark in `word` colour. */
export function logo(x, y, h, word = CREAM) {
  const inner = lockupSrc.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/, '').replace(/#16140F/gi, word);
  const s = h / 130;
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s, 5)})">${inner}</g>`;
}
export function colophon(x, y, h) {
  const s = h / 130;
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s, 5)})"><path fill="#CE4029" d="M22 0H78A22 22 0 0 1 100 22V108A22 22 0 0 1 78 130H22A22 22 0 0 1 0 108V22A22 22 0 0 1 22 0Z"/><path fill="#FFFDF8" d="M50 50C60 40 74 37 86 40L85 56C73 53 60 56 54.5 61V101.5A4.5 4.5 0 0 1 45.5 101.5V61C40 56 27 53 15 56L14 40C26 37 40 40 50 50Z"/></g>`;
}

/** Split a title into balanced lines (max 2). */
export function wrap(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const w = text.split(' ');
  let best = [text], score = Infinity;
  for (let i = 1; i < w.length; i++) {
    const a = w.slice(0, i).join(' '), b = w.slice(i).join(' ');
    const s = Math.max(a.length, b.length);
    if (s < score) { score = s; best = [a, b]; }
  }
  return best;
}

function ageBadge(cx, cy, rr, age) {
  return `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${TOK.gold}"/><circle cx="${cx}" cy="${cy}" r="${r(rr - 1.6)}" fill="none" stroke="${INK}" stroke-width="0.35" stroke-dasharray="0.9 0.9" opacity=".5"/>
<text x="${cx}" y="${r(cy - rr * 0.28)}" text-anchor="middle" font-family="${IS}" font-weight="600" font-size="${r(rr * 0.3)}" letter-spacing="0.6" fill="${INK}">AGES</text>
<text x="${cx}" y="${r(cy + rr * 0.42)}" text-anchor="middle" font-family="${FR}" font-weight="600" font-size="${r(rr * 0.78)}" fill="${INK}">${age.replace('-', '–')}</text>`;
}

/* the picture window: x 16 → 206, y 100 → 202 */
export const WIN = { x: 16, y: 100, w: 190, h: 102, r: 9 };

/** The hero scene inside the window, in flat colour with ink outlines. kit: a Story Wall kit; age picks the density. */
export function windowScene(kit, age, seed) {
  const { x, y, w, h } = WIN;
  const big = age === '3-5';
  const S = new Scene({ W: w, H: h, lw: 0.75, seed });
  const dark = ['sea-deep', 'forest', 'red-deep', 'sea', 'red'].includes(kit.accent);
  // ground band inside the window
  const g = hill(S.rand, { x0: -2, x1: w + 2, y: h * 0.66, a: 5, n: 3, bottom: h + 2, phase: 1 });
  S.shape(g.d, { fill: kit.indoor ? kit.ground : kit.space ? 'sky' : 'moss', colour: true, box: [0, h * 0.6, w, h * 0.4], area: w * h * 0.36 });
  if (!kit.indoor && !kit.space) { const far = hill(S.rand, { x0: -2, x1: w + 2, y: h * 0.58, a: 4, n: 3, bottom: h + 2, phase: 2 }); S.shape(far.d, { fill: 'forest-light', colour: true, box: [0, h * 0.5, w, h * 0.2], area: w * h * 0.1, layer: -0.1 }); }
  if (kit.space) for (let i = 0; i < 3; i++) { const cx = 20 + S.rand() * (w - 40), rx = 5 + S.rand() * 7, cy = yAt(g, cx) + 8 + S.rand() * 16; S.shape(`M${cx - rx} ${cy}a${rx} ${rx / 3} 0 1 0 ${2 * rx} 0a${rx} ${rx / 3} 0 1 0 ${-2 * rx} 0z`, { fill: 'sea', colour: true, box: [cx - rx, cy - 3, 2 * rx, 6], layer: 0.5 }); }
  const put = (name, o) => S.add(name, { ...o, colour: true, swap: { ...(o.swap || {}), ...(dark ? { 'paper-deep': kit.accent === 'sea-deep' ? 'sea' : 'forest-light' } : {}) } });
  // one sky object, the set piece, two characters, a few small things
  const [skyName, , , sw] = kit.sky[0];
  put(skyName, { cx: w - 30, cy: 26, w: Math.min(34, sw * 0.16) });
  const [s1, , w1, o1 = {}] = kit.set;
  const sx = 52, sh = S.size(s1, 100).h / 100;
  put(s1, { cx: sx, by: yAt(g, sx) + 3, w: Math.min(w1 * 0.26, 52 / sh), ...o1 });
  const chars = kit.front.slice(0, big ? 2 : 3);
  chars.forEach((n, i) => { const cx = 112 + i * (big ? 44 : 30); const cw = big ? 32 : 24; put(n, { cx, by: yAt(g, cx) + 4, w: cw, flip: i === 1 }); });
  const [cname] = kit.count;
  S.scatter([cname], big ? 3 : 5, [6, 4, w - 60, 34], [6, 9], { pad: 3, rot: 20, colour: true });
  if (kit.tiny[0]) S.scatter([kit.tiny[0]], 2, [6, 36, w - 12, 20], [6, 8], { pad: 4, rot: 20, colour: true });
  return `<g clip-path="url(#win)"><g transform="translate(${x} ${y})">${S.svg('auto')}</g></g>`;
}

/** Front cover SVG. */
export function frontCover({ seriesName, title, age, kit, seed = 1 }) {
  const { W, H } = COVER;
  const accent = TOK[kit.accent] || kit.accent;
  const lines = wrap(title, 16);
  const fs = lines.some((l) => l.length > 13) ? 17 : 20;
  const ty = lines.length === 1 ? 78 : 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">
<defs><clipPath id="win"><rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" rx="${WIN.r}"/></clipPath></defs>
<rect width="${W}" height="${H}" fill="${GREEN}"/>
${logo(16, 15, 13)}
${ageBadge(W - 30, 24, 13.5, age)}
<text x="16" y="46" font-family="${IS}" font-weight="600" font-size="4.6" letter-spacing="1.6" fill="${GOLDL}">${esc(seriesName.toUpperCase())}</text>
${lines.map((l, i) => `<text x="15.4" y="${r(ty + i * fs * 1.02)}" font-family="${FR}" font-weight="600" font-size="${fs}" letter-spacing="-0.25" fill="${CREAM}">${esc(l)}</text>`).join('\n')}
<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" rx="${WIN.r}" fill="${accent}"/>
${windowScene(kit, age, seed)}
<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" rx="${WIN.r}" fill="none" stroke="${CREAM}" stroke-width="0.9" opacity=".9"/>
${place('pim-full', { cx: 186, by: 213.5, w: 30, mode: 'flat', swap: { 'paper-deep': 'forest-light' } }).svg}
<text x="16" y="213" font-family="${IS}" font-weight="400" font-size="4.3" fill="${CREAM}" opacity=".92">A colouring story · You choose the ending</text>
</svg>`;
}

const BLURB = {
  sv: 'En målarberättelse utan ord. Ditt barn färglägger, väljer slutet och ritar det.',
  de: 'Eine Malgeschichte ohne Worte. Ihr Kind malt aus, wählt das Ende und zeichnet es.',
  fr: 'Une histoire à colorier sans mots. Votre enfant colorie, choisit la fin et la dessine.',
  es: 'Un cuento para colorear sin palabras. Tu hijo colorea, elige el final y lo dibuja.',
  nl: 'Een kleurverhaal zonder woorden. Je kind kleurt, kiest het einde en tekent het.',
};

function textBlock(x, y, text, { size = 4, width = 120, lh = 1.35, fill = CREAM, weight = 400, family = IS } = {}) {
  const maxChars = Math.floor(width / (size * 0.5));
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
  if (cur.trim()) lines.push(cur.trim());
  return { svg: lines.map((l, i) => `<text x="${r(x)}" y="${r(y + i * size * lh)}" font-family="${family}" font-weight="${weight}" font-size="${size}" fill="${fill}">${esc(l)}</text>`).join('\n'), h: lines.length * size * lh };
}
function recycle(cx, cy, s) {
  const arm = (rot) => `<g transform="rotate(${rot} ${cx} ${cy})"><path d="M${cx - s * 0.18} ${cy - s * 0.42} l${s * 0.22} ${-s * 0.0} l${s * 0.2} ${s * 0.34}" fill="none" stroke="${CREAM}" stroke-width="${s * 0.09}" stroke-linecap="round" stroke-linejoin="round"/><path d="M${cx + s * 0.3} ${cy - s * 0.02} l${s * 0.13} ${-s * 0.2} l${-s * 0.24} ${s * 0.0}z" fill="${CREAM}"/></g>`;
  return arm(0) + arm(120) + arm(240);
}

/** Back cover SVG. */
export function backCover({ seriesName, title, age, hook }) {
  const { W, H } = COVER;
  const x = 18;
  let y = 32;
  const out = [];
  out.push(`<text x="${x}" y="${y}" font-family="${FR}" font-weight="600" font-size="11.5" fill="${CREAM}">Stories your child finishes.</text>`);
  y += 13;
  const en = textBlock(x, y, `${hook} Colour the story, talk about it, choose the ending, then draw it on the last page.`, { size: 4.8, width: 178, lh: 1.4 });
  out.push(en.svg); y += en.h + 5;
  for (const [k, v] of Object.entries(BLURB)) {
    out.push(`<text x="${x}" y="${r(y)}" font-family="${IS}" font-weight="600" font-size="3.3" letter-spacing="0.8" fill="${GOLDL}">${k.toUpperCase()}</text>`);
    const b = textBlock(x + 10, y, v, { size: 3.6, width: 172, lh: 1.32, fill: CREAM });
    out.push(b.svg); y += b.h + 2.6;
  }
  const by = 164;
  out.push(`<circle cx="${x + 12}" cy="${by}" r="12" fill="none" stroke="${CREAM}" stroke-width="0.8"/><text x="${x + 12}" y="${by + 1.4}" text-anchor="middle" font-family="${FR}" font-weight="600" font-size="8.2" fill="${CREAM}">32</text><text x="${x + 12}" y="${by + 6}" text-anchor="middle" font-family="${IS}" font-weight="600" font-size="2.7" letter-spacing="0.5" fill="${CREAM}">PAGES</text>`);
  out.push(`<circle cx="${x + 41}" cy="${by}" r="12" fill="${TOK.gold}"/><text x="${x + 41}" y="${by - 2.8}" text-anchor="middle" font-family="${IS}" font-weight="600" font-size="2.7" letter-spacing="0.5" fill="${INK}">AGES</text><text x="${x + 41}" y="${by + 4.8}" text-anchor="middle" font-family="${FR}" font-weight="600" font-size="8.2" fill="${INK}">${age.replace('-', '–')}</text>`);
  out.push(recycle(x + 70, by, 20) + `<text x="${x + 70}" y="${by + 16.5}" text-anchor="middle" font-family="${IS}" font-weight="600" font-size="2.5" letter-spacing="0.4" fill="${CREAM}">PAPER</text>`);
  const qx = W - 66, qy = 142;
  out.push(`<rect x="${qx - 2}" y="${qy - 2}" width="34" height="34" rx="3" fill="#FFFFFF"/>` + qrSvg('https://telning.com/send', { x: qx, y: qy, size: 30, dark: INK, light: '#FFFFFF', quiet: 1 }));
  out.push(`<text x="${qx + 36}" y="${qy + 6}" font-family="${IS}" font-weight="600" font-size="3.4" fill="${CREAM}">Send Pim</text><text x="${qx + 36}" y="${qy + 10.6}" font-family="${IS}" font-weight="600" font-size="3.4" fill="${CREAM}">your ending</text>`);
  out.push(`<text x="${qx + 36}" y="${qy + 19.5}" font-family="${IS}" font-size="2.9" fill="${GOLDL}">create &amp; share</text><text x="${qx + 36}" y="${qy + 24}" font-family="${IS}" font-weight="600" font-size="3.2" fill="${CREAM}">@telning.pub</text>`);
  out.push(colophon(x, 192, 14));
  out.push(`<text x="${x + 16}" y="198" font-family="${IS}" font-weight="600" font-size="3.4" fill="${CREAM}">Telning Publishing House · telning.com</text>`);
  out.push(`<text x="${x + 16}" y="203.4" font-family="${IS}" font-size="2.9" fill="${CREAM}" opacity=".85">Created by the Telning team of cognitive and behavioural scientists. Designed in Sweden.</text>`);
  out.push(`<text x="${x + 16}" y="208.2" font-family="${IS}" font-size="2.9" fill="${CREAM}" opacity=".85">${esc(seriesName)} · ${esc(title)} · Premium FSC-certified paper.</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">
<rect width="${W}" height="${H}" fill="${GREEN}"/>
${out.join('\n')}
</svg>`;
}

/** Full cover spread: back + spine + front (32 pages: 3.35 mm spine). */
export function spread({ front, back, spine = 3.35 }) {
  const { W, H } = COVER;
  const inner = (s) => s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const T = W * 2 + spine;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(T)} ${H}" width="${r(T)}mm" height="${H}mm">
<rect width="${r(T)}" height="${H}" fill="${GREEN}"/>
<g>${inner(back)}</g><g transform="translate(${r(W + spine)} 0)">${inner(front)}</g>
</svg>`;
}

/* ---------- inside pages: the conversation guide (left), a drawing to colour (right), the empty last page ---------- */
const pageSvg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE.W} ${PAGE.H}" width="${PAGE.W}mm" height="${PAGE.H}mm"><rect width="${PAGE.W}" height="${PAGE.H}" fill="#FFFFFF"/>${inner}</svg>`;

/** Left page: one question and one good word for the grown-up, facing the drawing. */
export function guidePage({ question, word, page = 6 }) {
  const { W, H } = PAGE;
  return pageSvg(`
<text x="24" y="40" font-family="${IS}" font-weight="600" font-size="4" letter-spacing="1.6" fill="#A9321D">TALK ABOUT IT</text>
${textBlock(24, 62, question, { size: 12.5, width: 150, lh: 1.2, fill: INK, weight: 600, family: FR }).svg}
<path d="M24 118h22" stroke="#CE4029" stroke-width="0.8"/>
<text x="24" y="134" font-family="${IS}" font-weight="600" font-size="4" letter-spacing="1.6" fill="#4A453D">ONE GOOD WORD</text>
<rect x="24" y="142" width="${Math.max(44, word.length * 5.6 + 16)}" height="18" rx="9" fill="${TOK['sky-light']}"/>
<text x="${24 + Math.max(44, word.length * 5.6 + 16) / 2}" y="154" text-anchor="middle" font-family="${FR}" font-weight="400" font-size="9" fill="${INK}">${esc(word)}</text>
<text x="24" y="${H - 18}" font-family="${IS}" font-size="3.4" fill="#4A453D">Wait after the question. Let your child say what they see first.</text>
<text x="${W - 24}" y="${H - 18}" text-anchor="end" font-family="${IS}" font-weight="600" font-size="3.6" fill="#4A453D">${page}</text>`);
}

/** Right page: the drawing to colour, black-and-white line art from the series kit. */
export function drawingPage({ kit, seed = 3, page = 7 }) {
  const { W, H } = PAGE;
  const m = 18, w = W - 2 * m, h = H - 2 * m - 10;
  const S = new Scene({ W: w, H: h, lw: 0.9, seed, line: INK, fill: '#FFFFFF' });
  const g = hill(S.rand, { x0: -2, x1: w + 2, y: h * 0.7, a: 6, n: 3, bottom: h + 2, phase: 1 });
  S.shape(g.d, { fill: 'moss', colour: false, box: [0, h * 0.65, w, h * 0.35] });
  const [skyName, , , sw] = kit.sky[0];
  S.add(skyName, { cx: w - 34, cy: 30, w: Math.min(40, sw * 0.2), colour: false });
  const [s1, , w1, o1 = {}] = kit.set;
  const sh = S.size(s1, 100).h / 100;
  S.add(s1, { cx: 56, by: yAt(g, 56) + 4, w: Math.min(w1 * 0.36, 86 / sh), colour: false, ...o1 });
  kit.front.slice(0, 2).forEach((n, i) => S.add(n, { cx: 118 + i * 44, by: yAt(g, 118 + i * 44) + 5, w: 38, colour: false, flip: i === 1 }));
  S.scatter([kit.count[0]], 4, [4, 4, w - 60, 40], [8, 12], { pad: 3, rot: 20, colour: false });
  return pageSvg(`<defs><clipPath id="pg"><rect x="${m}" y="${m}" width="${w}" height="${h}" rx="4"/></clipPath></defs><g clip-path="url(#pg)"><g transform="translate(${m} ${m})">${S.svg('line')}</g></g><rect x="${m}" y="${m}" width="${w}" height="${h}" rx="4" fill="none" stroke="${INK}" stroke-width="0.5"/>
<text x="${W - 24}" y="${H - 18}" text-anchor="end" font-family="${IS}" font-weight="600" font-size="3.6" fill="#4A453D">${page}</text>`);
}

/** The empty last page: your child draws the ending here. */
export function lastPage({ page = 31 }) {
  const { W, H } = PAGE;
  return pageSvg(`
<rect x="18" y="30" width="${W - 36}" height="${H - 76}" rx="6" fill="none" stroke="${INK}" stroke-width="0.6" stroke-dasharray="2 2.4"/>
<text x="${W / 2}" y="${H - 30}" text-anchor="middle" font-family="${FR}" font-weight="600" font-size="9" fill="${INK}">Draw your ending here.</text>
<text x="${W / 2}" y="${H - 21}" text-anchor="middle" font-family="${IS}" font-size="3.6" fill="#4A453D">Then send it to Pim: telning.com/send</text>
${place('pim-portrait', { cx: W - 34, cy: H - 26, w: 16, mode: 'flat' }).svg}
<text x="${W - 24}" y="${H - 10}" text-anchor="end" font-family="${IS}" font-weight="600" font-size="3.6" fill="#4A453D">${page}</text>`);
}
