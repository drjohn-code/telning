// The book cover: 8.5 × 8.5 in with 0.125 in bleed = 222.25 mm square (Lulu). Matte laminated, Telning green edge
// to edge. Front: logo, age badge, series name, title, and the series world drawn half as cream line art (the book
// is for colouring) and half in colour. Back: the tagline, the blurb in six languages, badges, the QR code and the
// handles. The spine is plain green (no text; 32 pages give a 3.35 mm spine).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, TOK, r } from './svg.mjs';
import { Scene } from './scene.mjs';
import { qrSvg } from './qr.mjs';

export const COVER = { W: 222.25, H: 222.25, bleed: 3.175 };
export const GREEN = '#1E4A3B';
const CREAM = TOK.cream, GOLDL = TOK['gold-light'], INK = TOK.ink;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

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

/** Split a title into balanced lines (max 2) for a given size. */
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
<text x="${cx}" y="${r(cy - rr * 0.28)}" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="${r(rr * 0.3)}" letter-spacing="0.6" fill="${INK}">AGES</text>
<text x="${cx}" y="${r(cy + rr * 0.42)}" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="${r(rr * 0.78)}" fill="${INK}">${age.replace('-', '–')}</text>`;
}

/** Front cover SVG. scene(S) places objects on a Scene that covers the whole cover (units mm). */
export function frontCover({ seriesName, title, age, scene, seed = 1 }) {
  const { W, H } = COVER;
  const lw = age === '3-5' ? 1.5 : 1.1;
  const S = new Scene({ W, H, lw, seed, line: CREAM, fill: GREEN });
  scene(S);
  const lines = wrap(title, 17);
  const fs = lines.some((l) => l.length > 15) ? 14.2 : 15.6;
  const ty = 60;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">
<rect width="${W}" height="${H}" fill="${GREEN}"/>
${S.svg()}
${logo(16, 15, 13)}
${ageBadge(W - 30, 24, 13.5, age)}
<text x="16" y="${ty - 13}" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="4.6" letter-spacing="1.6" fill="${GOLDL}">${esc(seriesName.toUpperCase())}</text>
${lines.map((l, i) => `<text x="15" y="${r(ty + i * fs * 1.04)}" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="${fs}" letter-spacing="-0.2" fill="${CREAM}">${esc(l)}</text>`).join('\n')}
<text x="16" y="${r(ty + lines.length * fs * 1.04 + 1)}" font-family="Instrument Sans, sans-serif" font-weight="400" font-size="4.4" fill="${CREAM}" opacity=".9">A colouring story · You choose the ending</text>
</svg>`;
}

const BLURB = {
  sv: 'En målarberättelse utan ord. Ditt barn färglägger, väljer slutet och ritar det.',
  de: 'Eine Malgeschichte ohne Worte. Ihr Kind malt aus, wählt das Ende und zeichnet es.',
  fr: 'Une histoire à colorier sans mots. Votre enfant colorie, choisit la fin et la dessine.',
  es: 'Un cuento para colorear sin palabras. Tu hijo colorea, elige el final y lo dibuja.',
  nl: 'Een kleurverhaal zonder woorden. Je kind kleurt, kiest het einde en tekent het.',
};

function textBlock(x, y, text, { size = 4, width = 120, lh = 1.35, fill = CREAM, weight = 400, family = 'Instrument Sans, sans-serif' } = {}) {
  const maxChars = Math.floor(width / (size * 0.5));
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
  if (cur.trim()) lines.push(cur.trim());
  return { svg: lines.map((l, i) => `<text x="${r(x)}" y="${r(y + i * size * lh)}" font-family="${family}" font-weight="${weight}" font-size="${size}" fill="${fill}">${esc(l)}</text>`).join('\n'), h: lines.length * size * lh };
}

function recycle(cx, cy, s) {
  // three chasing arrows (generic "recycle with paper" mark)
  const arm = (rot) => `<g transform="rotate(${rot} ${cx} ${cy})"><path d="M${cx - s * 0.18} ${cy - s * 0.42} l${s * 0.22} ${-s * 0.0} l${s * 0.2} ${s * 0.34}" fill="none" stroke="${CREAM}" stroke-width="${s * 0.09}" stroke-linecap="round" stroke-linejoin="round"/><path d="M${cx + s * 0.3} ${cy - s * 0.02} l${s * 0.13} ${-s * 0.2} l${-s * 0.24} ${s * 0.0}z" fill="${CREAM}"/></g>`;
  return arm(0) + arm(120) + arm(240);
}

/** Back cover SVG. */
export function backCover({ seriesName, title, age, hook }) {
  const { W, H } = COVER;
  const x = 18;
  let y = 30;
  const out = [];
  out.push(`<text x="${x}" y="${y}" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="10.5" fill="${CREAM}">Stories your child finishes.</text>`);
  y += 12;
  const en = textBlock(x, y, `${hook} Colour the story, talk about it, choose the ending, then draw it on the last page.`, { size: 4.6, width: 175, lh: 1.4 });
  out.push(en.svg); y += en.h + 4;
  for (const [k, v] of Object.entries(BLURB)) {
    out.push(`<text x="${x}" y="${r(y)}" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="3.2" letter-spacing="0.8" fill="${GOLDL}">${k.toUpperCase()}</text>`);
    const b = textBlock(x + 10, y, v, { size: 3.4, width: 170, lh: 1.32, fill: CREAM });
    out.push(b.svg); y += b.h + 2.2;
  }
  // badges row
  const by = 168;
  out.push(`<circle cx="${x + 11}" cy="${by}" r="11" fill="none" stroke="${CREAM}" stroke-width="0.7"/><text x="${x + 11}" y="${by + 1.2}" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="7.4" fill="${CREAM}">32</text><text x="${x + 11}" y="${by + 5.6}" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="2.6" letter-spacing="0.5" fill="${CREAM}">PAGES</text>`);
  out.push(`<circle cx="${x + 37}" cy="${by}" r="11" fill="${TOK.gold}"/><text x="${x + 37}" y="${by - 2.6}" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="2.6" letter-spacing="0.5" fill="${INK}">AGES</text><text x="${x + 37}" y="${by + 4.4}" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="7.4" fill="${INK}">${age.replace('-', '–')}</text>`);
  out.push(recycle(x + 62, by, 18) + `<text x="${x + 62}" y="${by + 15}" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="2.4" letter-spacing="0.4" fill="${CREAM}">PAPER</text>`);
  // QR + share
  const qx = W - 66, qy = 146;
  out.push(`<rect x="${qx - 2}" y="${qy - 2}" width="34" height="34" rx="3" fill="#FFFFFF"/>` + qrSvg('https://telning.com/send', { x: qx, y: qy, size: 30, dark: INK, light: '#FFFFFF', quiet: 1 }));
  out.push(`<text x="${qx + 36}" y="${qy + 6}" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="3.3" fill="${CREAM}">Send Pim</text><text x="${qx + 36}" y="${qy + 10.4}" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="3.3" fill="${CREAM}">your ending</text>`);
  out.push(`<text x="${qx + 36}" y="${qy + 19}" font-family="Instrument Sans, sans-serif" font-size="2.8" fill="${GOLDL}">create &amp; share</text><text x="${qx + 36}" y="${qy + 23.4}" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="3.1" fill="${CREAM}">@telning.pub</text>`);
  // imprint
  out.push(colophon(x, 194, 13));
  out.push(`<text x="${x + 14}" y="200" font-family="Instrument Sans, sans-serif" font-weight="600" font-size="3.2" fill="${CREAM}">Telning Publishing House · telning.com</text>`);
  out.push(`<text x="${x + 14}" y="205" font-family="Instrument Sans, sans-serif" font-size="2.8" fill="${CREAM}" opacity=".85">Created by the Telning team of cognitive and behavioural scientists. Designed in Sweden.</text>`);
  out.push(`<text x="${x + 14}" y="209.6" font-family="Instrument Sans, sans-serif" font-size="2.8" fill="${CREAM}" opacity=".85">${esc(seriesName)} · ${esc(title)} · Printed to order.</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">
<rect width="${W}" height="${H}" fill="${GREEN}"/>
${out.join('\n')}
</svg>`;
}

/** Full cover spread for Lulu: back + spine + front (441.5 × 222.25 mm for 32 pages on 60# paper). */
export function spread({ front, back, spine = 3.35 }) {
  const { W, H } = COVER;
  const inner = (s) => s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const T = W * 2 + spine - COVER.bleed * 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(T)} ${H}" width="${r(T)}mm" height="${H}mm">
<rect width="${r(T)}" height="${H}" fill="${GREEN}"/>
<g>${inner(back)}</g><g transform="translate(${r(W + spine)} 0)">${inner(front)}</g>
</svg>`;
}
