// Gift print art: greeting cards (14.1 cm square, folded), postcards (A6 landscape), mug wraps (Printful 11 oz print
// area 228.6 × 88.9 mm) and tote prints (241 mm square print area). Units: mm. Flat paper objects, lots of air,
// one short line in Fraunces: the parameters of the best-selling cards (one central picture, a short greeting,
// blank inside), done the quiet Telning way.
import { place, TOK, r } from './svg.mjs';
import { colophon, logo } from './cover.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = TOK;
const FR = 'Fraunces, Georgia, serif', IS = 'Instrument Sans, sans-serif';
const P = (name, o) => place(name, { mode: 'flat', ...o }).svg;
const shadow = (cx, cy, rx, ry = rx * 0.16, fill = T['paper-deep'], op = 0.9) => `<ellipse cx="${r(cx)}" cy="${r(cy)}" rx="${r(rx)}" ry="${r(ry)}" fill="${fill}" opacity="${op}"/>`;
const text = (x, y, s, size, { fill = T.ink, anchor = 'middle', family = FR, weight = 600, ls = 0 } = {}) => `<text x="${r(x)}" y="${r(y)}" text-anchor="${anchor}" font-family="${family}" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" fill="${fill}">${esc(s)}</text>`;
const lines = (x, y, arr, size, o = {}) => arr.map((l, i) => text(x, y + i * size * 1.08, l, size, o)).join('');
const stars = (list, fill = T['gold-light']) => list.map(([x, y, s]) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-5l1.3 3.4 3.7.3-2.8 2.4.9 3.6L0 2.8l-3.1 1.9.9-3.6-2.8-2.4 3.7-.3z" fill="${fill}"/>`).join('');
const dots = (list, fill) => list.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${fill}"/>`).join('');
const grass = (y, w, fill = T.moss) => `<path d="M-5 ${y}C${w * 0.25} ${y - 6} ${w * 0.6} ${y - 4} ${w + 5} ${y - 7}V${y + 60}H-5z" fill="${fill}"/>`;

/* ---------- greeting cards: 141 × 141 mm front (bleed 3 mm) ---------- */
export const CARD = 147; // 141 + 2 × 3 bleed
const C = CARD, cx = C / 2;

const CARDS = {
  'birthday-balloons': () => ({ bg: T.cream, art: `<path d="M50 54 72 90M70 44 73 90M92 50 75 90M106 62 77 90" stroke="${T['ink-soft']}" stroke-width=".5" fill="none"/>${P('partyballoon', { cx: 50, cy: 38, w: 22, rot: -10 })}${P('partyballoon', { cx: 70, cy: 26, w: 22, swap: { red: 'gold', 'red-deep': 'gold-deep', 'red-light': 'gold-light' } })}${P('partyballoon', { cx: 92, cy: 32, w: 22, rot: 8, swap: { red: 'sea', 'red-deep': 'sea-deep', 'red-light': 'sky' } })}${P('partyballoon', { cx: 106, cy: 48, w: 18, rot: 14, swap: { red: 'moss', 'red-deep': 'forest-light', 'red-light': 'sky-light' } })}${shadow(cx, 116, 22)}${P('bear', { cx, by: 116, w: 40 })}`, words: ['Happy birthday!'] }),
  'make-a-wish': () => ({ bg: T['gold-light'], art: `${shadow(64, 108, 34, 5, T.gold, .6)}${P('cake', { cx: 64, by: 108, w: 62 })}${P('bunny', { cx: 108, by: 108, w: 30 })}${stars([[30, 30, 1.2], [112, 26, 1], [96, 44, .8]], T.cream)}`, words: ['Make a wish!'] }),
  'around-the-sun': () => ({ bg: T['sky-light'], art: `<ellipse cx="${cx}" cy="66" rx="52" ry="30" fill="none" stroke="${T.sea}" stroke-width=".7" stroke-dasharray="2.2 2.4"/>${P('sun', { cx, cy: 66, w: 44 })}${P('rocket', { cx: 118, cy: 54, w: 20, rot: 40 })}${stars([[24, 28, 1], [40, 100, .8], [120, 104, 1]], T.gold)}`, words: ['Another trip', 'around the sun!'] }),
  'boo': () => ({ bg: T.forest, ink: T.cream, art: `${P('moon', { cx: 104, cy: 30, w: 26 })}${stars([[24, 24, 1], [44, 40, .7], [128, 60, .8]], T['gold-light'])}${P('ghost', { cx: 56, cy: 66, w: 40 })}${P('bat', { cx: 104, cy: 66, w: 30 })}${shadow(98, 112, 18, 3, T['forest-light'], 1)}${P('lantern', { cx: 98, by: 112, w: 34 })}`, words: ['Boo!'] }),
  'merry-christmas': () => ({ bg: T.cream, art: `${dots([[22, 20, 1.6], [40, 34, 1.2], [118, 22, 1.4], [128, 46, 1.1], [30, 60, 1], [112, 70, 1.2]], T.sky)}${shadow(cx, 112, 40)}${P('fir', { cx, by: 112, w: 52 })}${P('present', { cx: 42, by: 112, w: 22 })}${P('gift', { cx: 104, by: 112, w: 24 })}`, words: ['Merry Christmas!'] }),
  'happy-new-year': () => ({ bg: T['sea-deep'], ink: T.cream, art: `${P('firework', { cx: 46, cy: 44, w: 44 })}${P('firework', { cx: 100, cy: 34, w: 36, swap: { red: 'sky', gold: 'gold-light' } })}${P('firework', { cx: 92, cy: 84, w: 26, swap: { red: 'rose' } })}${stars([[20, 90, .9], [126, 70, .8], [60, 100, .7]], T['gold-light'])}`, words: ['Happy New Year!'] }),
  'happy-easter': () => ({ bg: T.cream, art: `${grass(108, C)}${P('tulip', { cx: 32, by: 110, w: 18 })}${P('tulip', { cx: 118, by: 110, w: 16 })}${P('bunny', { cx: 78, by: 110, w: 40 })}${P('egg', { cx: 50, by: 112, w: 14, rot: -10 })}${P('egg', { cx: 102, by: 113, w: 13, rot: 12, swap: { sky: 'blush', gold: 'moss' } })}`, words: ['Happy Easter!'] }),
  'thank-you': () => ({ bg: T.blush, art: `<g transform="translate(-30 -40) scale(1.4)">${P('tulip', { cx: 62, by: 104, w: 30, rot: -14 })}${P('daisy', { cx: 74, by: 104, w: 26 })}${P('tulip', { cx: 88, by: 104, w: 28, rot: 12, swap: { red: 'gold', 'red-light': 'gold-light', 'red-deep': 'gold-deep' } })}${P('tulip', { cx: 72, by: 100, w: 22, rot: -2, swap: { red: 'sea', 'red-light': 'sky', 'red-deep': 'sea-deep' } })}<path d="M64 96c4 4 16 4 20 0l-2 8c-4 3-12 3-16 0z" fill="${T.red}"/><path d="M72 99c-6 2-10 8-8 12M76 99c6 2 10 8 8 12" stroke="${T.red}" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`, words: ['Thank you!'] }),
  'welcome-little-one': () => ({ bg: T['sky-light'], art: `${stars([[28, 26, 1.1], [46, 50, .8], [118, 30, 1], [124, 76, .8], [30, 90, .7]], T.gold)}${P('moon', { cx: 76, cy: 62, w: 70, rot: 10 })}${P('duck', { cx: 70, cy: 64, w: 30, rot: -6 })}`, words: ['Welcome, little one.'] }),
  'to-the-moon': () => ({ bg: T['sea-deep'], ink: T.cream, art: `${P('moon', { cx: 104, cy: 32, w: 34 })}${stars([[24, 28, 1], [48, 20, .7], [130, 74, .8], [30, 70, .8]], T['gold-light'])}${P('heart', { cx: 58, cy: 64, w: 34, rot: -8 })}<path d="M58 80c-2 8 4 14 0 24" stroke="${T.cream}" stroke-width=".6" fill="none"/>`, words: ['Love you to the moon', 'and back.'] }),
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

/* ---------- postcards: A6 landscape 148 × 105 mm (+ 3 mm bleed, rounded corners: keep 8 mm clear) ---------- */
export const PC = { W: 154, H: 111 };
const PW = PC.W, PH = PC.H;
const POSTCARDS = {
  'hello-grandma': () => ({ bg: T.cream, art: `${grass(88, PW)}${P('house', { cx: 104, by: 92, w: 44 })}${P('heart', { cx: 104, cy: 22, w: 13, rot: 8 })}${P('mailbox', { cx: 132, by: 92, w: 13 })}${P('tulip', { cx: 76, by: 92, w: 11 })}${P('tulip', { cx: 84, by: 92, w: 9, swap: { red: 'gold', 'red-light': 'gold-light', 'red-deep': 'gold-deep' } })}`, words: ['Hello,', 'Grandma!'], tx: 38 }),
  'happy-birthday': () => ({ bg: T['gold-light'], art: `${P('bunting', { cx: PW / 2, cy: 18, w: 140 })}<path d="M108 70 122 104M122 60 123 104M138 66 124 104" stroke="${T['ink-soft']}" stroke-width=".45" fill="none"/>${P('partyballoon', { cx: 108, cy: 56, w: 18, rot: -10 })}${P('partyballoon', { cx: 122, cy: 46, w: 18, swap: { red: 'sea', 'red-deep': 'sea-deep', 'red-light': 'sky' } })}${P('partyballoon', { cx: 138, cy: 54, w: 16, rot: 10, swap: { red: 'moss', 'red-deep': 'forest-light', 'red-light': 'sky-light' } })}`, words: ['Happy', 'birthday!'], tx: 46 }),
  'happy-halloween': () => ({ bg: T.forest, ink: T.cream, art: `${P('moon', { cx: 132, cy: 22, w: 20 })}${P('bat', { cx: 104, cy: 26, w: 22 })}${P('ghost', { cx: 128, cy: 62, w: 18 })}${shadow(98, 94, 22, 3, T['forest-light'], 1)}${P('lantern', { cx: 88, by: 95, w: 28 })}${P('pumpkin', { cx: 112, by: 95, w: 20 })}`, words: ['Happy', 'Halloween!'], tx: 40 }),
  'happy-new-year': () => ({ bg: T['sea-deep'], ink: T.cream, art: `${P('firework', { cx: 104, cy: 32, w: 36 })}${P('firework', { cx: 134, cy: 22, w: 22, swap: { red: 'sky', gold: 'gold-light' } })}${P('moon', { cx: 20, cy: 18, w: 14 })}<path d="M70 111V92h10v-8l6-5 6 5v8h12V86h14v25z" fill="${T.ink}" opacity=".55"/><path d="M118 111V90h12l5-5 5 5h18v21z" fill="${T.ink}" opacity=".55"/>${dots([[76, 96, .9], [98, 100, .9], [124, 96, .9], [146, 100, .9]], T['gold-light'])}`, words: ['Happy', 'New Year!'], tx: 40 }),
  'merry-christmas': () => ({ bg: T.cream, art: `${dots([[70, 14, 1.4], [92, 26, 1], [140, 14, 1.2], [146, 44, 1], [80, 50, 1.1]], T.sky)}${shadow(112, 96, 34, 4)}${P('fir', { cx: 112, by: 96, w: 38 })}${P('present', { cx: 88, by: 97, w: 15 })}${P('penguin', { cx: 138, by: 97, w: 18 })}`, words: ['Merry', 'Christmas!'], tx: 42 }),
  'happy-easter': () => ({ bg: T['sky-light'], art: `${grass(92, PW)}${P('bunny', { cx: 112, by: 96, w: 30 })}${P('egg', { cx: 88, by: 98, w: 11, rot: -10 })}${P('egg', { cx: 136, by: 98, w: 11, rot: 10, swap: { sky: 'blush', gold: 'moss' } })}${P('tulip', { cx: 146, by: 96, w: 10 })}`, words: ['Happy', 'Easter!'], tx: 42 }),
  'happy-midsummer': () => ({ bg: T.cream, art: `${P('bunting', { cx: PW / 2, cy: 16, w: 140, swap: { red: 'moss', 'red-deep': 'forest-light', gold: 'gold-light', sea: 'sky' } })}${grass(92, PW)}${P('daisy', { cx: 96, by: 96, w: 16 })}${P('daisy', { cx: 110, by: 96, w: 13 })}${P('tulip', { cx: 124, by: 96, w: 12, swap: { red: 'rose', 'red-light': 'blush', 'red-deep': 'red-light' } })}${P('daisy', { cx: 138, by: 96, w: 15 })}${P('bee', { cx: 120, cy: 50, w: 16 })}`, words: ['Happy', 'Midsummer!'], tx: 42 }),
  'under-the-same-sky': () => ({ bg: T['sea-deep'], ink: T.cream, art: `${P('moon', { cx: 128, cy: 24, w: 24 })}${stars([[96, 16, .9], [84, 40, .7], [144, 56, .8], [70, 20, .6]], T['gold-light'])}<path d="M90 111c6-30 20-40 40-44l20-2v46z" fill="${T.forest}"/>${P('owl', { cx: 116, by: 76, w: 26 })}`, words: ['Under the', 'same sky.'], tx: 42 }),
};

export function postcardFront(key) {
  const d = POSTCARDS[key]();
  const ink = d.ink || T.ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW}mm" height="${PH}mm"><rect width="${PW}" height="${PH}" fill="${d.bg}"/>${d.art}${lines(d.tx, 50, d.words, 12.5, { fill: ink })}</svg>`;
}
export function postcardBack(key, name) {
  const lineY = [62, 74, 86];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW}mm" height="${PH}mm"><rect width="${PW}" height="${PH}" fill="${T.cream}"/>
<line x1="${PW / 2}" y1="16" x2="${PW / 2}" y2="${PH - 16}" stroke="${T['ink-soft']}" stroke-width=".3"/>
${lineY.map((y) => `<line x1="${PW / 2 + 8}" y1="${y}" x2="${PW - 14}" y2="${y}" stroke="${T['ink-soft']}" stroke-width=".3"/>`).join('')}
<rect x="${PW - 34}" y="14" width="20" height="24" rx="1" fill="none" stroke="${T['ink-soft']}" stroke-width=".3" stroke-dasharray="1 1"/>
${colophon(12, PH - 24, 9)}${text(21, PH - 20.5, 'Telning Publishing House', 2.6, { family: IS, anchor: 'start' })}${text(21, PH - 16.8, `“${name}” · Designed in Sweden · telning.com`, 2.1, { family: IS, anchor: 'start', weight: 400, fill: T['ink-soft'] })}
</svg>`;
}

/* ---------- mugs: wrap 228.6 × 88.9 mm; left half = the picture side, right half = the words side ---------- */
export const MUG = { W: 228.6, H: 88.9 };
const MW = MUG.W, MH = MUG.H, L = MW / 4, R = (MW * 3) / 4;
const MUGS = {
  'the-moon': () => `${stars([[L - 30, 20, 1.1], [L + 32, 16, .9], [L + 36, 60, .8], [L - 36, 66, .7]], T.gold)}${P('moon', { cx: L + 8, cy: 46, w: 50, rot: 10 })}${P('pim-full', { cx: L - 6, cy: 48, w: 26 })}`,
  'the-garden': () => `${grass(70, MW / 2 + 4)}${P('tulip', { cx: L - 26, by: 74, w: 16 })}${P('tulip', { cx: L - 8, by: 74, w: 20, swap: { red: 'gold', 'red-light': 'gold-light', 'red-deep': 'gold-deep' } })}${P('tulip', { cx: L + 12, by: 74, w: 17 })}${P('snail', { cx: L + 34, by: 74, w: 18 })}${P('bee', { cx: L + 20, cy: 20, w: 14 })}`,
  'the-red-balloon': () => `${grass(72, MW / 2 + 4)}${P('house', { cx: L - 12, by: 76, w: 40 })}${P('partyballoon', { cx: L + 26, cy: 26, w: 18, rot: 8 })}`,
  'the-train': () => `<path d="M0 70h${MW / 2 + 6}" stroke="${T['ink-soft']}" stroke-width="1.2"/>${P('train', { cx: L - 12, by: 70.6, w: 40 })}${P('wagon', { cx: L + 25, by: 70.6, w: 29 })}${P('cloud', { cx: L - 24, cy: 18, w: 22 })}`,
  'snow-day': () => `${dots([[L - 34, 14, 1.2], [L - 14, 24, 1], [L + 30, 14, 1.3], [L + 40, 40, 1], [L - 40, 46, 1.1], [L + 20, 32, .9]], T.sky)}${P('snowflake', { cx: L + 30, cy: 26, w: 14 })}${shadow(L, 78, 22, 3, T['sky-light'], 1)}${P('snowman', { cx: L - 4, by: 78, w: 34 })}`,
  'one-more-page': () => `${P('bookstack', { cx: L + 18, by: 76, w: 34 })}${P('pim-full', { cx: L - 16, by: 78, w: 32 })}`,
};
export function mugWrap(key, words) {
  const size = words.length > 18 ? 9 : 11;
  const ws = words.length > 18 ? words.replace(/ the /, ' the\n').split('\n') : [words];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MW} ${MH}" width="${MW}mm" height="${MH}mm"><rect width="${MW}" height="${MH}" fill="#FFFFFF"/>${MUGS[key]()}${lines(R, MH / 2 + 3 - (ws.length - 1) * size * 0.5, ws, size)}${colophon(R - 3, MH - 16, 7)}</svg>`;
}

/* ---------- tote prints: 241 mm square print area; 'natural' (ink words) and 'black' (cream words) ---------- */
export const TOTE = 241;
const TW = TOTE;
const TOTES = {
  'library-day': () => `${P('bookstack', { cx: TW / 2, by: 160, w: 110 })}${P('crayon-red', { cx: TW / 2 + 72, by: 160, w: 12, rot: 18 })}`,
  'crayons': () => ['crayon-red', 'crayon-gold', 'crayon-sea', 'crayon-forest', 'crayon-red'].map((n, i) => P(n, { cx: TW / 2 - 56 + i * 28, by: 160, w: 18, rot: (i - 2) * 4, swap: i === 4 ? { red: 'rose', 'red-light': 'blush', 'red-deep': 'red-light' } : undefined })).join(''),
  'little-stories': () => colophon(TW / 2 - 30, 40, 78),
  'to-the-moon': () => `${P('moon', { cx: TW / 2 + 40, cy: 70, w: 70, rot: 10 })}${P('rocket', { cx: TW / 2 - 40, cy: 110, w: 34, rot: 35 })}${stars([[TW / 2 - 70, 50, 2], [TW / 2 - 10, 40, 1.6], [TW / 2 + 70, 140, 1.5]], T.gold)}`,
  'grow-slowly': () => `${P('tulip', { cx: TW / 2 - 40, by: 160, w: 34 })}${P('tulip', { cx: TW / 2, by: 160, w: 44, swap: { red: 'gold', 'red-light': 'gold-light', 'red-deep': 'gold-deep' } })}${P('tulip', { cx: TW / 2 + 40, by: 160, w: 28 })}${P('bee', { cx: TW / 2 + 60, cy: 50, w: 24 })}`,
  'what-would-you-choose': () => P('pim-full', { cx: TW / 2, by: 162, w: 100 }),
};
export function totePrint(key, words, variant) {
  const ink = variant === 'black' ? T.cream : T.ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TW} ${TW}" width="${TW}mm" height="${TW}mm">${TOTES[key]()}${text(TW / 2, 196, words, words.length > 24 ? 15 : 19, { fill: ink })}</svg>`;
}

export const KEYS = { cards: Object.keys(CARDS), postcards: Object.keys(POSTCARDS), mugs: Object.keys(MUGS), totes: Object.keys(TOTES) };
export { logo };
