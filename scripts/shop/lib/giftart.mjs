// Gift print art: greeting cards (14.1 cm square, folded), postcards (A6 landscape), mug wraps (11 oz print area
// 228.6 × 88.9 mm) and tote prints (241 mm square print area). Units: mm. Every design is one small, quiet Pim scene
// in flat paper colours with lots of air and one short line in Fraunces. Pim comes from art/pim (never redrawn).
import { place, TOK, r } from './svg.mjs';
import { colophon, logo } from './cover.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = TOK;
const FR = 'Fraunces, Georgia, serif', IS = 'Instrument Sans, sans-serif';
const P = (name, o) => place(name, { mode: 'flat', ...o }).svg;
/** Pim, flat; on a dark ground the paper shadow takes the ground's deeper tone. */
const PIM = (o, dark) => P('pim-full', { ...o, swap: { ...(o.swap || {}), ...(dark ? { 'paper-deep': dark } : {}) } });
const shadow = (cx, cy, rx, ry = rx * 0.16, fill = T['paper-deep'], op = 0.9) => `<ellipse cx="${r(cx)}" cy="${r(cy)}" rx="${r(rx)}" ry="${r(ry)}" fill="${fill}" opacity="${op}"/>`;
const text = (x, y, s, size, { fill = T.ink, anchor = 'middle', family = FR, weight = 600, ls = 0 } = {}) => `<text x="${r(x)}" y="${r(y)}" text-anchor="${anchor}" font-family="${family}" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" fill="${fill}">${esc(s)}</text>`;
const lines = (x, y, arr, size, o = {}) => arr.map((l, i) => text(x, y + i * size * 1.08, l, size, o)).join('');
const stars = (list, fill = T['gold-light']) => list.map(([x, y, s]) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-5l1.3 3.4 3.7.3-2.8 2.4.9 3.6L0 2.8l-3.1 1.9.9-3.6-2.8-2.4 3.7-.3z" fill="${fill}"/>`).join('');
const dots = (list, fill) => list.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${fill}"/>`).join('');
const grass = (y, w, fill = T.moss) => `<path d="M-5 ${y}C${w * 0.25} ${y - 6} ${w * 0.6} ${y - 4} ${w + 5} ${y - 7}V${y + 60}H-5z" fill="${fill}"/>`;
const string = (x1, y1, x2, y2, col = T['ink-soft']) => `<path d="M${x1} ${y1}Q${(x1 + x2) / 2 + 3} ${(y1 + y2) / 2} ${x2} ${y2}" stroke="${col}" stroke-width=".5" fill="none"/>`;
const bubble = (x, y, w, h, fill = T.cream) => `<path d="M${x} ${y}h${w}a4 4 0 0 1 4 4v${h}a4 4 0 0 1-4 4h${w * 0.3}l-6 7v-7h${-w * 0.7}a4 4 0 0 1-4-4v${-h}a4 4 0 0 1 4-4z" fill="${fill}" stroke="${T.ink}" stroke-width=".5"/>`;

/* ---------- greeting cards: 141 × 141 mm front (bleed 3 mm) ---------- */
export const CARD = 147;
const C = CARD, cx = C / 2;

const CARDS = {
  'birthday-balloons': () => ({ bg: T.cream, art: `${string(74, 60, 62, 96)}${string(80, 56, 70, 96)}${string(94, 62, 76, 96)}${string(106, 72, 78, 96)}${P('partyballoon', { cx: 56, cy: 40, w: 22, rot: -10 })}${P('partyballoon', { cx: 76, cy: 28, w: 22, swap: { red: 'gold', 'red-deep': 'gold-deep', 'red-light': 'gold-light' } })}${P('partyballoon', { cx: 96, cy: 34, w: 22, rot: 8, swap: { red: 'sea', 'red-deep': 'sea-deep', 'red-light': 'sky' } })}${P('partyballoon', { cx: 110, cy: 50, w: 20, rot: 14, swap: { red: 'moss', 'red-deep': 'forest-light', 'red-light': 'moss' } })}${PIM({ cx: 72, cy: 106, w: 30 })}`, words: ['Happy birthday!'] }),
  'make-a-wish': () => ({ bg: T['gold-light'], art: `${shadow(60, 110, 34, 5, T.gold, .6)}${P('cake', { cx: 60, by: 110, w: 56 })}${PIM({ cx: 106, by: 112, w: 30 }, T.gold)}${stars([[30, 30, 1.2], [112, 26, 1], [96, 44, .8]], T.cream)}`, words: ['Make a wish!'] }),
  'around-the-sun': () => ({ bg: T['sky-light'], art: `<ellipse cx="${cx}" cy="66" rx="54" ry="30" fill="none" stroke="${T.sea}" stroke-width=".7" stroke-dasharray="2.2 2.4"/>${P('sun', { cx, cy: 66, w: 42 })}${P('rocket', { cx: 118, cy: 50, w: 22, rot: 40 })}${PIM({ cx: 118, cy: 48, w: 10 })}${stars([[24, 28, 1], [40, 100, .8], [120, 104, 1]], T.gold)}`, words: ['Another trip', 'around the sun!'] }),
  'boo': () => ({ bg: T.forest, ink: T.cream, art: `${P('moon', { cx: 104, cy: 30, w: 26 })}${stars([[24, 24, 1], [44, 40, .7], [128, 60, .8]], T['gold-light'])}${P('ghost', { cx: 52, cy: 66, w: 36 })}${P('bat', { cx: 100, cy: 60, w: 26 })}${shadow(98, 112, 18, 3, T['forest-light'], 1)}${P('lantern', { cx: 100, by: 112, w: 30 })}${PIM({ cx: 66, by: 113, w: 28 }, T['forest-light'])}`, words: ['Boo!'] }),
  'merry-christmas': () => ({ bg: T.cream, art: `${dots([[22, 20, 1.6], [40, 34, 1.2], [118, 22, 1.4], [128, 46, 1.1], [30, 60, 1], [112, 70, 1.2]], T.sky)}${shadow(cx, 112, 40)}${P('fir', { cx: 66, by: 112, w: 50 })}${P('present', { cx: 36, by: 112, w: 20 })}${PIM({ cx: 108, by: 113, w: 28 })}${stars([[66, 60, 1.4]], T.gold)}`, words: ['Merry Christmas!'] }),
  'happy-new-year': () => ({ bg: T['sea-deep'], ink: T.cream, art: `${P('firework', { cx: 46, cy: 40, w: 42 })}${P('firework', { cx: 100, cy: 32, w: 34, swap: { red: 'sky', gold: 'gold-light' } })}${P('firework', { cx: 96, cy: 76, w: 24, swap: { red: 'rose' } })}${stars([[20, 90, .9], [126, 70, .8], [60, 100, .7]], T['gold-light'])}${PIM({ cx: 50, by: 114, w: 28 }, T.sea)}`, words: ['Happy New Year!'] }),
  'happy-easter': () => ({ bg: T.cream, art: `${grass(108, C)}${P('tulip', { cx: 28, by: 110, w: 16 })}${P('tulip', { cx: 124, by: 110, w: 14 })}${P('bunny', { cx: 96, by: 110, w: 34 })}${PIM({ cx: 54, by: 112, w: 28 }, T['forest-light'])}${P('egg', { cx: 74, by: 112, w: 12, rot: -10 })}${P('egg', { cx: 116, by: 113, w: 11, rot: 12, swap: { sky: 'blush', gold: 'moss' } })}`, words: ['Happy Easter!'] }),
  'thank-you': () => ({ bg: T.blush, art: `<g transform="translate(-18 -36) scale(1.3)">${P('tulip', { cx: 62, by: 104, w: 28, rot: -14 })}${P('daisy', { cx: 74, by: 104, w: 24 })}${P('tulip', { cx: 88, by: 104, w: 26, rot: 12, swap: { red: 'gold', 'red-light': 'gold-light', 'red-deep': 'gold-deep' } })}${P('tulip', { cx: 72, by: 100, w: 20, rot: -2, swap: { red: 'sea', 'red-light': 'sky', 'red-deep': 'sea-deep' } })}<path d="M64 96c4 4 16 4 20 0l-2 8c-4 3-12 3-16 0z" fill="${T.red}"/></g>${PIM({ cx: 108, by: 114, w: 28 }, T.rose)}`, words: ['Thank you!'] }),
  'welcome-little-one': () => ({ bg: T['sky-light'], art: `${stars([[28, 26, 1.1], [46, 50, .8], [118, 30, 1], [124, 76, .8], [30, 90, .7]], T.gold)}${P('moon', { cx: 76, cy: 58, w: 66, rot: 10 })}${P('duck', { cx: 70, cy: 60, w: 26, rot: -6 })}${PIM({ cx: 112, by: 112, w: 22 }, T.sky)}`, words: ['Welcome, little one.'] }),
  'to-the-moon': () => ({ bg: T['sea-deep'], ink: T.cream, art: `${P('moon', { cx: 104, cy: 32, w: 34 })}${stars([[24, 28, 1], [48, 20, .7], [130, 74, .8], [30, 70, .8]], T['gold-light'])}${P('heart', { cx: 58, cy: 52, w: 30, rot: -8 })}${string(58, 66, 62, 92, T.cream)}${PIM({ cx: 64, by: 112, w: 28 }, T.sea)}`, words: ['Love you to the moon', 'and back.'] }),
};

export function cardFront(key) {
  const d = CARDS[key]();
  const ink = d.ink || T.ink;
  const n = d.words.length, size = d.words.join('').length > 20 ? 9 : 11;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${C} ${C}" width="${C}mm" height="${C}mm"><rect width="${C}" height="${C}" fill="${d.bg}"/>${d.art}${lines(cx, n > 1 ? 124 : 130, d.words, size, { fill: ink })}</svg>`;
}
export function cardBack(key, name) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${C} ${C}" width="${C}mm" height="${C}mm"><rect width="${C}" height="${C}" fill="${T.cream}"/>${colophon(cx - 5, 102, 13)}${text(cx, 124, 'Telning Publishing House', 3.6, { family: IS })}${text(cx, 129.5, `“${name}” · Designed in Sweden · telning.com`, 2.8, { family: IS, weight: 400, fill: T['ink-soft'] })}</svg>`;
}
export function cardInside() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${C} ${C}" width="${C}mm" height="${C}mm"><rect width="${C}" height="${C}" fill="${T.cream}"/></svg>`;
}

/* ---------- postcards: A6 landscape 148 × 105 mm (+ 3 mm bleed) ---------- */
export const PC = { W: 154, H: 111 };
const PW = PC.W, PH = PC.H;
const POSTCARDS = {
  'hello-grandma': () => ({ bg: T.cream, art: `${grass(88, PW)}${P('house', { cx: 108, by: 92, w: 40 })}${P('heart', { cx: 108, cy: 26, w: 12, rot: 8 })}${P('mailbox', { cx: 80, by: 92, w: 12 })}${PIM({ cx: 64, by: 94, w: 22 }, T['forest-light'])}${P('tulip', { cx: 138, by: 92, w: 9 })}`, words: ['Hello,', 'Grandma!'], tx: 34 }),
  'happy-birthday': () => ({ bg: T['gold-light'], art: `${P('bunting', { cx: PW / 2, cy: 18, w: 140 })}${string(110, 68, 114, 92)}${string(122, 60, 116, 92)}${string(136, 68, 118, 92)}${P('partyballoon', { cx: 110, cy: 56, w: 16, rot: -10 })}${P('partyballoon', { cx: 122, cy: 46, w: 16, swap: { red: 'sea', 'red-deep': 'sea-deep', 'red-light': 'sky' } })}${P('partyballoon', { cx: 136, cy: 54, w: 15, rot: 10, swap: { red: 'moss', 'red-deep': 'forest-light', 'red-light': 'moss' } })}${PIM({ cx: 112, by: 98, w: 24 }, T.gold)}`, words: ['Happy', 'birthday!'], tx: 40 }),
  'happy-halloween': () => ({ bg: T.forest, ink: T.cream, art: `${P('moon', { cx: 134, cy: 22, w: 18 })}${P('bat', { cx: 100, cy: 24, w: 20 })}${P('ghost', { cx: 134, cy: 60, w: 16 })}${shadow(104, 94, 24, 3, T['forest-light'], 1)}${P('lantern', { cx: 118, by: 95, w: 22 })}${PIM({ cx: 92, by: 96, w: 22 }, T['forest-light'])}`, words: ['Happy', 'Halloween!'], tx: 40 }),
  'happy-new-year': () => ({ bg: T['sea-deep'], ink: T.cream, art: `${P('firework', { cx: 106, cy: 30, w: 34 })}${P('firework', { cx: 136, cy: 20, w: 22, swap: { red: 'sky', gold: 'gold-light' } })}${P('moon', { cx: 20, cy: 18, w: 14 })}<path d="M70 111V92h10v-8l6-5 6 5v8h12V86h14v25z" fill="${T.ink}" opacity=".55"/><path d="M118 111V90h12l5-5 5 5h18v21z" fill="${T.ink}" opacity=".55"/>${dots([[76, 96, .9], [98, 100, .9], [124, 96, .9], [146, 100, .9]], T['gold-light'])}${PIM({ cx: 104, by: 112, w: 22 }, T.sea)}`, words: ['Happy', 'New Year!'], tx: 38 }),
  'merry-christmas': () => ({ bg: T.cream, art: `${dots([[70, 14, 1.4], [92, 26, 1], [140, 14, 1.2], [146, 44, 1], [80, 50, 1.1]], T.sky)}${shadow(112, 96, 34, 4)}${P('fir', { cx: 118, by: 96, w: 36 })}${P('present', { cx: 140, by: 97, w: 13 })}${P('penguin', { cx: 92, by: 97, w: 15 })}${PIM({ cx: 74, by: 98, w: 22 })}`, words: ['Merry', 'Christmas!'], tx: 42 }),
  'happy-easter': () => ({ bg: T['sky-light'], art: `${grass(92, PW)}${P('bunny', { cx: 120, by: 96, w: 26 })}${PIM({ cx: 92, by: 97, w: 22 }, T['forest-light'])}${P('egg', { cx: 106, by: 98, w: 10, rot: -10 })}${P('egg', { cx: 140, by: 98, w: 10, rot: 10, swap: { sky: 'blush', gold: 'moss' } })}${P('tulip', { cx: 146, by: 96, w: 9 })}`, words: ['Happy', 'Easter!'], tx: 40 }),
  'happy-midsummer': () => ({ bg: T.cream, art: `${P('bunting', { cx: PW / 2, cy: 16, w: 140, swap: { red: 'moss', 'red-deep': 'forest-light', gold: 'gold-light', sea: 'sky' } })}${grass(92, PW)}${P('daisy', { cx: 92, by: 96, w: 14 })}${PIM({ cx: 110, by: 98, w: 22 }, T['forest-light'])}${P('tulip', { cx: 128, by: 96, w: 11, swap: { red: 'rose', 'red-light': 'blush', 'red-deep': 'red-light' } })}${P('daisy', { cx: 140, by: 96, w: 13 })}${P('bee', { cx: 128, cy: 52, w: 14 })}`, words: ['Happy', 'Midsummer!'], tx: 40 }),
  'under-the-same-sky': () => ({ bg: T['sea-deep'], ink: T.cream, art: `${P('moon', { cx: 130, cy: 24, w: 22 })}${stars([[98, 16, .9], [86, 40, .7], [144, 56, .8], [72, 20, .6]], T['gold-light'])}<path d="M86 111c6-30 20-40 40-44l24-2v46z" fill="${T.forest}"/>${P('owl', { cx: 124, by: 76, w: 22 })}${PIM({ cx: 100, by: 112, w: 22 }, T.sea)}`, words: ['Under the', 'same sky.'], tx: 40 }),
};

export function postcardFront(key) {
  const d = POSTCARDS[key]();
  const ink = d.ink || T.ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW}mm" height="${PH}mm"><rect width="${PW}" height="${PH}" fill="${d.bg}"/>${d.art}${lines(d.tx, 48, d.words, 12.5, { fill: ink })}</svg>`;
}
/** The back: address lines, a stamp box, the colophon; `written` adds a handwritten line and a stamp (for the photos). */
export function postcardBack(key, name, { written = false } = {}) {
  const lineY = [62, 74, 86];
  const HF = 'Bradley Hand, Snell Roundhand, Segoe Script, cursive';
  const hand = written ? `<text x="16" y="36" font-family="${HF}" font-size="5.8" fill="#2f5c88">Dear Grandma,</text>
<text x="16" y="48" font-family="${HF}" font-size="4.8" fill="#2f5c88">We finished the book.</text>
<text x="16" y="57" font-family="${HF}" font-size="4.8" fill="#2f5c88">Elin chose the moon!</text>
<text x="16" y="66" font-family="${HF}" font-size="4.8" fill="#2f5c88">Love, us</text>
<g transform="translate(${PW - 34} 14)"><rect width="20" height="24" rx="1" fill="${T['sky-light']}" stroke="${T.sea}" stroke-width=".5" stroke-dasharray="1 1"/>${P('tulip', { cx: 10, by: 20, w: 9 })}<text x="10" y="6" text-anchor="middle" font-family="${IS}" font-size="2.4" font-weight="600" fill="${T['sea-deep']}">POST</text></g>
<text x="${PW / 2 + 9}" y="60" font-family="Bradley Hand, Snell Roundhand, Segoe Script, cursive" font-size="5.6" fill="#2f5c88">Grandma Britt</text><text x="${PW / 2 + 9}" y="72" font-family="Bradley Hand, Snell Roundhand, Segoe Script, cursive" font-size="5.6" fill="#2f5c88">Lindvägen 4</text><text x="${PW / 2 + 9}" y="84" font-family="Bradley Hand, Snell Roundhand, Segoe Script, cursive" font-size="5.6" fill="#2f5c88">Uppsala</text>` : `<rect x="${PW - 34}" y="14" width="20" height="24" rx="1" fill="none" stroke="${T['ink-soft']}" stroke-width=".3" stroke-dasharray="1 1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW}mm" height="${PH}mm"><rect width="${PW}" height="${PH}" fill="${T.cream}"/>
<line x1="${PW / 2}" y1="16" x2="${PW / 2}" y2="${PH - 16}" stroke="${T['ink-soft']}" stroke-width=".3"/>
${lineY.map((y) => `<line x1="${PW / 2 + 8}" y1="${y}" x2="${PW - 14}" y2="${y}" stroke="${T['ink-soft']}" stroke-width=".3"/>`).join('')}
${hand}
${colophon(12, PH - 24, 9)}${text(21, PH - 20.5, 'Telning Publishing House', 2.6, { family: IS, anchor: 'start' })}${text(21, PH - 16.8, `“${name}” · Designed in Sweden · telning.com`, 2.1, { family: IS, anchor: 'start', weight: 400, fill: T['ink-soft'] })}
</svg>`;
}

/* ---------- mugs: wrap 228.6 × 88.9 mm; left half = the picture side, right half = the words side ---------- */
export const MUG = { W: 228.6, H: 88.9 };
const MW = MUG.W, MH = MUG.H, L = MW / 4, R = (MW * 3) / 4;
const MUGS = {
  'the-moon': () => `${stars([[L - 32, 18, 1.1], [L + 34, 14, .9], [L + 38, 62, .8], [L - 38, 64, .7]], T.gold)}${P('moon', { cx: L + 6, cy: 46, w: 48, rot: 10 })}${PIM({ cx: L - 8, by: 58, w: 26 }, T['gold-light'])}`,
  'the-garden': () => `${grass(70, MW / 2 + 4)}${P('tulip', { cx: L + 10, by: 74, w: 15 })}${P('tulip', { cx: L + 26, by: 74, w: 18, swap: { red: 'gold', 'red-light': 'gold-light', 'red-deep': 'gold-deep' } })}${P('wateringcan', { cx: L - 4, cy: 44, w: 20, rot: -24 })}${PIM({ cx: L - 22, by: 76, w: 26 }, T['forest-light'])}${P('bee', { cx: L + 34, cy: 24, w: 12 })}`,
  'the-red-balloon': () => `${grass(72, MW / 2 + 4)}${P('house', { cx: L + 18, by: 76, w: 36 })}${string(L - 14, 34, L - 12, 56)}${P('partyballoon', { cx: L - 14, cy: 22, w: 16, rot: 6 })}${PIM({ cx: L - 16, by: 78, w: 26 }, T['forest-light'])}`,
  'the-train': () => `<path d="M0 70h${MW / 2 + 6}" stroke="${T['ink-soft']}" stroke-width="1.2"/>${P('train', { cx: L - 18, by: 70.6, w: 38 })}${P('wagon', { cx: L + 20, by: 70.6, w: 28 })}${PIM({ cx: L + 20, by: 56, w: 14 })}${P('cloud', { cx: L - 26, cy: 16, w: 22 })}`,
  'snow-day': () => `${dots([[L - 36, 14, 1.2], [L - 14, 24, 1], [L + 32, 14, 1.3], [L + 42, 40, 1], [L - 42, 46, 1.1], [L + 20, 32, .9]], T.sky)}${shadow(L, 78, 26, 3, T['sky-light'], 1)}${P('snowman', { cx: L + 12, by: 78, w: 32 })}${PIM({ cx: L - 20, by: 79, w: 26 }, T['sky-light'])}`,
  'one-more-page': () => `${P('bookstack', { cx: L + 4, by: 76, w: 36 })}${PIM({ cx: L + 2, by: 50, w: 22 })}${P('book', { cx: L - 24, by: 76, w: 16, rot: -8 })}`,
};
export function mugWrap(key, words) {
  const size = words.length > 18 ? 9 : 11;
  const ws = words.length > 18 ? words.replace(/ the /, ' the\n').split('\n') : [words];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MW} ${MH}" width="${MW}mm" height="${MH}mm"><rect width="${MW}" height="${MH}" fill="#FFFFFF"/>${MUGS[key]()}${lines(R, MH / 2 + 3 - (ws.length - 1) * size * 0.5, ws, size)}${colophon(R - 3, MH - 16, 7)}</svg>`;
}

/* ---------- tote prints: 241 mm square print area ---------- */
export const TOTE = 241;
const TW = TOTE;
const TOTES = {
  'library-day': (dark) => `${P('bookstack', { cx: TW / 2 + 14, by: 166, w: 96 })}${P('crayon-red', { cx: TW / 2 + 70, by: 166, w: 12, rot: 18 })}${PIM({ cx: TW / 2 - 52, by: 170, w: 52 }, dark)}`,
  'crayons': (dark) => ['crayon-red', 'crayon-gold', 'crayon-sea', 'crayon-forest', 'crayon-red'].map((n, i) => P(n, { cx: TW / 2 - 30 + i * 26, by: 160, w: 17, rot: (i - 2) * 4, swap: i === 4 ? { red: 'rose', 'red-light': 'blush', 'red-deep': 'red-light' } : undefined })).join('') + PIM({ cx: TW / 2 - 76, by: 168, w: 50 }, dark),
  'little-stories': (dark) => `${colophon(TW / 2 - 50, 50, 72)}${PIM({ cx: TW / 2 + 48, by: 168, w: 54 }, dark)}`,
  'to-the-moon': (dark) => `${P('moon', { cx: TW / 2 + 44, cy: 64, w: 66, rot: 10 })}${P('rocket', { cx: TW / 2 - 40, cy: 112, w: 40, rot: 35 })}${PIM({ cx: TW / 2 - 44, cy: 106, w: 16 })}${stars([[TW / 2 - 70, 46, 2], [TW / 2 - 6, 36, 1.6], [TW / 2 + 72, 140, 1.5]], T.gold)}`,
  'grow-slowly': (dark) => `${P('tulip', { cx: TW / 2 - 2, by: 164, w: 30 })}${P('tulip', { cx: TW / 2 + 34, by: 164, w: 40, swap: { red: 'gold', 'red-light': 'gold-light', 'red-deep': 'gold-deep' } })}${P('tulip', { cx: TW / 2 + 68, by: 164, w: 26 })}${P('wateringcan', { cx: TW / 2 - 36, cy: 112, w: 34, rot: -24 })}${PIM({ cx: TW / 2 - 60, by: 168, w: 50 }, dark)}${P('bee', { cx: TW / 2 + 72, cy: 60, w: 20 })}`,
  'what-would-you-choose': (dark) => `${bubble(TW / 2 - 6, 40, 70, 30, dark ? T.cream : T.cream)}${text(TW / 2 + 32, 60, '?', 20, { fill: T.red })}${PIM({ cx: TW / 2 - 10, by: 168, w: 84 }, dark)}`,
};
export function totePrint(key, words, variant) {
  const ink = variant === 'black' ? T.cream : T.ink;
  const dark = variant === 'black' ? '#3a3732' : undefined;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TW} ${TW}" width="${TW}mm" height="${TW}mm">${TOTES[key](dark)}${text(TW / 2, 202, words, words.length > 24 ? 15 : 19, { fill: ink })}</svg>`;
}

export const KEYS = { cards: Object.keys(CARDS), postcards: Object.keys(POSTCARDS), mugs: Object.keys(MUGS), totes: Object.keys(TOTES) };
export { logo };
