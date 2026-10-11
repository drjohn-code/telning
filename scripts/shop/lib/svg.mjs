// Shop art engine: loads the paper objects from art/{objects,animals} and draws them in three modes.
//   flat    the object as it is (paper style, no outlines)
//   colour  flat token colours with an ink outline: the pre-coloured parts of a colouring poster
//   line    outline only, ready to colour: shading (class="sh" or opacity < 1) is dropped, ink stays ink
// Line colour and fill can change (cream lines on the green book cover). Stroke widths are given in the
// units of the artwork (mm for posters and covers) and converted per placement, so every line on a sheet has
// the same weight whatever the object's size.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const tokens = JSON.parse(readFileSync(join(ROOT, 'design/tokens.json'), 'utf8'));
export const TOK = Object.fromEntries(tokens.color.tokens.map((c) => [c.name, c.value.toUpperCase()]));
const HEX2TOK = Object.fromEntries(Object.entries(TOK).map(([k, v]) => [v, k]));
export const INK = TOK.ink;

const DIRS = ['art/objects', 'art/animals', 'art/science', 'art/pim'];
const cache = new Map();

/** All object names available to the engine. */
export function objectNames() {
  return DIRS.flatMap((d) => readdirSync(join(ROOT, d)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)));
}

/** { vb: [x, y, w, h], body } for one art file. */
export function loadObject(name) {
  if (cache.has(name)) return cache.get(name);
  const dir = DIRS.find((d) => existsSync(join(ROOT, d, `${name}.svg`)));
  if (!dir) throw new Error(`shop art: no object "${name}" in ${DIRS.join(', ')}`);
  const src = readFileSync(join(ROOT, dir, `${name}.svg`), 'utf8');
  const vb = (src.match(/viewBox="([^"]+)"/) || [])[1].split(/[\s,]+/).map(Number);
  const body = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const o = { vb, body };
  cache.set(name, o);
  return o;
}

const parseAttrs = (s) => {
  const a = {};
  for (const m of s.matchAll(/([\w:-]+)="([^"]*)"/g)) a[m[1]] = m[2];
  return a;
};
const attrStr = (a) => Object.entries(a).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => ` ${k}="${v}"`).join('');
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line']);

/** Colour value → hex, with optional token swaps ({ red: 'sea' }). */
function colour(v, swap) {
  if (!v || v === 'none') return v;
  const hex = v.toUpperCase();
  const tok = HEX2TOK[hex];
  if (tok && swap && swap[tok]) return TOK[swap[tok]] || swap[tok];
  return v;
}

/**
 * Re-draw an object's inner markup.
 * @param {string} name   art file name
 * @param {object} o      { mode: 'flat'|'colour'|'line', lw: outline width in object units,
 *                          line: line colour (ink), fill: line-mode fill (white), swap: token swaps,
 *                          strip: drop the o-* animation classes }
 */
export function drawObject(name, o = {}) {
  const { mode = 'flat', lw = 2, line = INK, fill = '#FFFFFF', swap } = o;
  const { body } = loadObject(name);
  const thin = lw * 0.62;
  let eyes = false;                                   // inside <g class="o-eyes">: eyes are never outlined
  return body.replace(/<(\/?)(\w+)([^>]*?)(\/?)>/g, (tag, close, el, rest, selfClose) => {
    if (close) { if (el === 'g') eyes = false; return tag; }
    if (el === 'g') {
      const a = parseAttrs(rest);
      eyes = /\bo-eyes\b/.test(a.class || '');
      delete a.class;
      return `<g${attrStr(a)}${selfClose ? '/' : ''}>`;
    }
    if (eyes && SHAPES.has(el) && mode !== 'flat') {
      const a = parseAttrs(rest);
      delete a.class;
      if (mode === 'colour') return `<${el}${attrStr({ ...a, fill: colour(a.fill, swap) })}/>`;
      const r = Number(a.r || a.rx || 0);
      return `<${el}${attrStr({ ...a, fill: r > 2 ? line : fill, stroke: undefined, opacity: undefined })}/>`;
    }
    if (!SHAPES.has(el)) return tag;
    const a = parseAttrs(rest);
    const cls = a.class || '';
    delete a.class;
    const op = a.opacity !== undefined ? Number(a.opacity) : 1;
    if (op === 0) return '';
    const shade = /\bsh\b/.test(cls) || op < 1;
    const keep = /\bkeep\b/.test(cls);               // never dropped in line mode (a real part drawn in a shade colour)
    const f = colour(a.fill, swap);
    const s = colour(a.stroke, swap);
    const sw = a['stroke-width'] !== undefined ? Number(a['stroke-width']) : (s && s !== 'none' ? 1 : 0);
    const isInk = f && f.toUpperCase() === INK;
    const strokeOnly = (!f || f === 'none') && s && s !== 'none';
    if (f) a.fill = f;
    if (s) a.stroke = s;

    if (mode === 'flat') return `<${el}${attrStr(a)}/>`;

    if (strokeOnly) {
      if (shade && mode === 'line' && !keep) return '';
      if (sw >= 3.5) {
        // a thick stroke (a tail, a stem, a ring): draw it as an outlined tube
        const outer = { ...a, stroke: line, 'stroke-width': sw + 2 * lw, opacity: undefined };
        const inner = { ...a, stroke: mode === 'line' ? fill : a.stroke, 'stroke-width': sw, opacity: mode === 'line' ? undefined : a.opacity };
        return `<${el}${attrStr(outer)}/><${el}${attrStr(inner)}/>`;
      }
      // thin lines (whiskers, strings) become ink lines
      return `<${el}${attrStr({ ...a, stroke: line, 'stroke-width': Math.max(thin, Math.min(sw, lw)), opacity: undefined })}/>`;
    }

    const small = (el === 'circle' && Number(a.r) <= 3) || (el === 'ellipse' && Number(a.rx) <= 3 && Number(a.ry) <= 3);
    const light = /^#FFFDF8$|^#FFFFFF$/i.test(f || '');
    if (mode === 'colour') {
      if (shade || isInk || (small && light)) return `<${el}${attrStr(a)}/>`;   // shading, ink and eye glints: no outline
      return `<${el}${attrStr({ ...a, stroke: line, 'stroke-width': lw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })}/>`;
    }

    // line mode
    if (shade && !keep) return '';
    if (isInk) return `<${el}${attrStr({ ...a, fill: line })}/>`;
    if (small && light) return `<${el}${attrStr({ ...a, fill })}/>`;   // eye glints
    return `<${el}${attrStr({ ...a, fill, stroke: line, 'stroke-width': lw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: undefined })}/>`;
  });
}

/**
 * Place an object on an artwork.
 * Position by top-left (x, y) or by bottom-centre (cx, by). Width w in artwork units.
 * lw is the outline width in ARTWORK units; it is converted to object units here.
 */
export function place(name, p) {
  const { vb } = loadObject(name);
  const s = p.w / vb[2];
  const h = vb[3] * s;
  let x = p.x, y = p.y;
  if (p.cx !== undefined) x = p.cx - p.w / 2;
  if (p.cy !== undefined) y = p.cy - h / 2;
  if (p.by !== undefined) y = p.by - h;
  const inner = drawObject(name, { ...p, lw: (p.lw ?? 2) / s });
  const flip = p.flip ? ` translate(${vb[2]} 0) scale(-1 1)` : '';
  const rot = p.rot ? ` rotate(${p.rot} ${vb[0] + vb[2] / 2} ${vb[1] + vb[3] / 2})` : '';
  return { svg: `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s, 5)})${rot}${flip} translate(${-vb[0]} ${-vb[1]})">${inner}</g>`, x, y, w: p.w, h };
}

export const r = (n, d = 2) => Number(n.toFixed(d));

/** A plain shape in the same three modes (backgrounds: hills, ground, sky bands). */
export function shape(d, p = {}) {
  const { mode = 'line', fill: tok = 'cream', lw = 2, line = INK, paper = '#FFFFFF', extra = '' } = p;
  const f = TOK[tok] || tok;
  if (mode === 'flat') return `<path d="${d}" fill="${f}"${extra}/>`;
  if (mode === 'colour') return `<path d="${d}" fill="${f}" stroke="${line}" stroke-width="${lw}" stroke-linejoin="round"${extra}/>`;
  return `<path d="${d}" fill="${paper}" stroke="${line}" stroke-width="${lw}" stroke-linejoin="round"${extra}/>`;
}

/** Small seeded random numbers, so every build draws the same picture. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
