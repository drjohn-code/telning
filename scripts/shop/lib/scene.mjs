// Scene builder for the colouring posters, covers and cards.
// A scene is a list of items (paper objects or plain shapes) on a sheet. Each item is drawn in `line` mode
// (to colour) or `colour` mode (pre-coloured, with the same ink outline). `pickColour` chooses which items are
// pre-coloured so that about `target` of the sheet carries colour, spread over the whole sheet.
import { place, shape, loadObject, rng as makeRng, r } from './svg.mjs';

export class Scene {
  constructor({ W, H, lw = 2, seed = 1, line, fill } = {}) {
    this.W = W; this.H = H; this.lw = lw; this.items = []; this.rand = makeRng(seed);
    this.line = line; this.fill = fill;
  }
  /** Size of an object at width w. */
  size(name, w) { const { vb } = loadObject(name); return { w, h: (vb[3] / vb[2]) * w }; }
  /** Add a paper object. Position: x,y (top-left) or cx,cy (centre) or cx,by (bottom-centre). */
  add(name, p) {
    const { h } = this.size(name, p.w);
    let x = p.x, y = p.y;
    if (p.cx !== undefined) x = p.cx - p.w / 2;
    if (p.cy !== undefined) y = p.cy - h / 2;
    if (p.by !== undefined) y = p.by - h;
    const it = { kind: 'obj', name, p: { ...p, x, y, cx: undefined, cy: undefined, by: undefined }, box: [x, y, p.w, h], colour: p.colour, layer: p.layer ?? 1 };
    this.items.push(it);
    return it;
  }
  /** Add a plain shape (hill, ground, band). box = [x, y, w, h] for the colour estimate; area = filled area estimate. */
  shape(d, p = {}) {
    const it = { kind: 'shape', d, p, box: p.box || [0, 0, 0, 0], area: p.area, colour: p.colour, layer: p.layer ?? 0 };
    this.items.push(it);
    return it;
  }
  /** Raw SVG drawn as is (titles, texture). */
  raw(svg, layer = 2) { const it = { kind: 'raw', svg, layer, colour: false, box: [0, 0, 0, 0] }; this.items.push(it); return it; }
  overlaps(b, pad = 0) {
    return this.items.some((it) => it.kind === 'obj' && !it.p.free && b[0] < it.box[0] + it.box[2] + pad && b[0] + b[2] + pad > it.box[0] && b[1] < it.box[1] + it.box[3] + pad && b[1] + b[3] + pad > it.box[1]);
  }
  /**
   * Scatter small objects in a region without overlapping the others.
   * names: array of names (picked in turn); n: how many; region [x, y, w, h]; w: [min, max] width.
   */
  scatter(names, n, region, w, opts = {}) {
    const out = [];
    let tries = 0, k = 0;
    while (out.length < n && tries < n * 200) {
      tries++;
      const name = names[k % names.length];
      const ww = w[0] + this.rand() * (w[1] - w[0]);
      const { h } = this.size(name, ww);
      const x = region[0] + this.rand() * Math.max(0, region[2] - ww);
      const y = region[1] + this.rand() * Math.max(0, region[3] - h);
      if (this.overlaps([x, y, ww, h], opts.pad ?? 6)) continue;
      out.push(this.add(name, { x, y, w: ww, rot: opts.rot ? (this.rand() - 0.5) * opts.rot : 0, flip: opts.flip ? this.rand() < 0.5 : false, swap: opts.swaps ? opts.swaps[k % opts.swaps.length] : undefined, colour: opts.colour, layer: opts.layer }));
      k++;
    }
    return out;
  }
  /**
   * Choose the pre-coloured items. fillRatio: name → share of its box that is ink-free colour (measured).
   * Spreads the choice over a grid so the colour is spread over the sheet.
   */
  pickColour(target, fillRatio, { countShare = 0.33, grid = [3, 4] } = {}) {
    const total = this.W * this.H;
    const est = (it) => it.kind === 'shape' ? (it.area ?? it.box[2] * it.box[3] * 0.8) : it.box[2] * it.box[3] * (fillRatio[it.name] ?? 0.55);
    const sum = () => this.items.filter((it) => it.colour === true).reduce((a, it) => a + est(it), 0);
    // 1. about a third of the open objects, spread over a grid of the sheet
    const objs = this.items.filter((it) => it.kind === 'obj' && it.colour === undefined);
    const want = Math.round(objs.length * countShare);
    const cells = new Map();
    for (const it of objs) {
      const cx = it.box[0] + it.box[2] / 2, cy = it.box[1] + it.box[3] / 2;
      const key = `${Math.min(grid[0] - 1, Math.floor((cx / this.W) * grid[0]))},${Math.min(grid[1] - 1, Math.floor((cy / this.H) * grid[1]))}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(it);
    }
    const queues = [...cells.values()].map((l) => l.sort(() => this.rand() - 0.5));
    let chosen = 0;
    while (chosen < want && queues.some((q) => q.length)) {
      for (const q of queues.sort(() => this.rand() - 0.5)) {
        const it = q.shift();
        if (!it || chosen >= want) continue;
        it.colour = true; chosen++;
      }
    }
    // 2. backgrounds, biggest first, while they fit under the target
    let have = sum();
    for (const it of this.items.filter((x) => x.kind === 'shape' && x.colour === undefined).sort((a, b) => est(b) - est(a))) {
      const a = est(it);
      if (have + a <= target * total * 1.12) { it.colour = true; have += a; } else it.colour = false;
    }
    // 3. still short: colour more objects, biggest first; too much: return the biggest coloured objects to line
    const open = this.items.filter((x) => x.kind === 'obj' && x.colour === undefined).sort((a, b) => est(b) - est(a));
    while (have < target * total * 0.88 && open.length) { const it = open.shift(); it.colour = true; have += est(it); }
    const done = this.items.filter((x) => x.kind === 'obj' && x.colour === true && x.p.colour === undefined).sort((a, b) => est(b) - est(a));
    while (have > target * total * 1.15 && done.length) { const it = done.shift(); it.colour = false; have -= est(it); }
    for (const it of this.items) if (it.colour === undefined) it.colour = false;
    return have / total;
  }
  /** Draw the scene. mode 'auto' = each item's own choice; 'line' or 'colour' or 'flat' forces it. */
  /** progress: share of the line items drawn as if a child coloured them with crayon (for the product photos). */
  svg(mode = 'auto', { progress = 0 } = {}) {
    const out = [];
    const rand = progress ? makeRng(99) : null;
    if (progress) out.push(CRAYON_FILTER);
    const sorted = this.items.map((it, i) => ({ it, i })).sort((a, b) => (a.it.layer - b.it.layer) || (a.i - b.i));
    for (const { it } of sorted) {
      const m = mode === 'auto' ? (it.colour ? 'colour' : 'line') : mode;
      const crayon = progress && m === 'line' && it.kind !== 'raw' && rand() < progress;
      if (it.kind === 'raw') out.push(it.svg);
      else if (it.kind === 'shape') {
        if (crayon) out.push(`<g filter="url(#crayon)">${shape(it.d, { mode: 'flat', fill: it.p.fill })}</g>${shape(it.d, { mode: 'line', lw: it.p.lw ?? this.lw, paper: 'none' })}`);
        else out.push(shape(it.d, { mode: m, fill: it.p.fill, lw: it.p.lw ?? this.lw, line: this.line, paper: it.p.paper || this.fill, extra: it.p.extra || '' }));
      } else if (crayon) {
        out.push(`<g filter="url(#crayon)">${place(it.name, { ...it.p, mode: 'flat' }).svg}</g>${place(it.name, { ...it.p, mode: 'line', lw: it.p.lw ?? this.lw, fill: 'none' }).svg}`);
      } else out.push(place(it.name, { ...it.p, mode: m, lw: it.p.lw ?? this.lw, line: this.line, fill: this.fill }).svg);
    }
    return out.join('\n');
  }
}

// A crayon look: grainy, a little uneven, not quite to the edge.
const CRAYON_FILTER = `<defs><filter id="crayon" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="1.4 0.5" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="t"/><feDisplacementMap in="t" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;

export { r };
