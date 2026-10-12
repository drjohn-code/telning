// Story Wall scenes: one landscape story scene per series (1000 × 700 mm). The same layout engine for all twelve:
// sky · far hills · a middle hill with the set pieces · the near ground with the characters · a path or a stream ·
// small discoveries to find and count · Pim hiding somewhere. Ages 3–5: fewer, bigger shapes. Ages 5–7: more,
// smaller things and more to find. Objects come from art/objects and art/animals; the scene picks ~30 % to colour.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../lib/svg.mjs';
import { hill, yAt } from '../lib/poster.mjs';
import { WALL } from '../lib/wall.mjs';

const has = (n) => ['objects', 'animals', 'science', 'pim'].some((d) => existsSync(join(ROOT, 'art', d, `${n}.svg`)));
const { W, H } = WALL;

/* One kit per series. sky: [name, cx, cy, w]. set: the big set piece on the middle hill; set2: the second one.
   mid: things on the middle hill; front: the characters on the near ground; corner: small things in the two front
   corners; tiny: things to count, scattered in the sky and on the ground. Colours are token names. */
export const KITS = {
  'home-hearts': { title: 'Home & Hearts', ground: 'moss', back: 'forest-light', far: 'sky-light', road: true,
    sky: [['sun', 850, 120, 150], ['cloud', 180, 110, 170], ['cloud', 520, 90, 130], ['kite', 700, 230, 110, { rot: 12 }], ['balloon', 300, 210, 120]],
    set: ['house', 300, 250], set2: ['house', 760, 190, { swap: { red: 'sea', 'red-deep': 'sea-deep' } }], set3: ['tree', 560, 150],
    mid: ['tree', 'mailbox', 'tree', 'bike'], front: ['cat', 'dog', 'bunny', 'seesaw', 'chair', 'hedgehog', 'duck'],
    corner: ['tulip', 'daisy', 'ball'], tiny: ['heart', 'bee', 'butterfly'], count: ['heart', 7] },
  'paws-claws': { title: 'Paws & Claws', ground: 'moss', back: 'forest-light', far: 'sky-light', stream: true,
    sky: [['sun', 860, 110, 140], ['cloud', 200, 100, 160], ['cloud', 560, 80, 120], ['owl', 420, 200, 100], ['butterfly', 700, 240, 90]],
    set: ['tree', 320, 300], set2: ['tree', 800, 230], set3: ['mushroom', 560, 90],
    mid: ['sheep', 'pig', 'tree', 'elephant', 'fir'], front: ['fox', 'bear', 'bunny', 'frog', 'hedgehog', 'turtle', 'mouse', 'duck'],
    corner: ['snail', 'mushroom', 'daisy', 'paw'], tiny: ['bee', 'ladybird', 'butterfly'], count: ['ladybird', 6] },
  'star-hoppers': { title: 'Star Hoppers', ground: 'sky', back: 'sea', far: 'sky-light', space: true,
    sky: [['planet', 830, 150, 220], ['moon', 150, 120, 150, { rot: -10 }], ['comet', 500, 100, 150], ['saucer', 680, 250, 150], ['satellite', 180, 270, 100]],
    set: ['rocket', 330, 240], set2: ['telescope', 760, 150], set3: ['rocket', 560, 110, { rot: 14 }],
    mid: ['pennant', 'satellite', 'pennant'], front: ['penguin', 'bear', 'owl', 'bunny', 'penguin', 'saucer', 'ball'],
    corner: ['star', 'ball', 'star'], tiny: ['star'], count: ['star', 12] },
  'little-gardeners': { title: 'Little Gardeners', ground: 'moss', back: 'forest-light', far: 'sky-light', stream: true,
    sky: [['sun', 860, 120, 150], ['cloud', 220, 100, 160], ['cloud', 560, 90, 110], ['butterfly', 420, 230, 100], ['bee', 700, 220, 80]],
    set: ['tree', 300, 290], set2: ['wateringcan', 780, 170], set3: ['mushroom', 560, 80],
    mid: ['tulip', 'daisy', 'tulip', 'carrot', 'tulip', 'daisy'], front: ['snail', 'frog', 'hedgehog', 'bunny', 'strawberry', 'pear', 'wateringcan', 'carrot'],
    corner: ['daisy', 'tulip', 'cherries', 'mushroom'], tiny: ['bee', 'ladybird', 'butterfly'], count: ['apple', 8] },
  'big-days': { title: 'Big Days', ground: 'blush', back: 'rose', far: 'sky-light', bunting: true,
    sky: [['balloon', 180, 170, 140], ['partyballoon', 820, 200, 110], ['firework', 560, 150, 150], ['star', 400, 240, 70], ['partyballoon', 700, 160, 90, { swap: { red: 'sea', 'red-deep': 'sea-deep', 'red-light': 'sky' } }]],
    set: ['cake', 330, 220], set2: ['fir', 790, 190], set3: ['present', 560, 110],
    mid: ['gift', 'lantern', 'pumpkin', 'present', 'candle'], front: ['duck', 'bunny', 'bear', 'pig', 'egg', 'cupcake', 'snowman', 'cat'],
    corner: ['egg', 'cupcake', 'candle', 'star'], tiny: ['star', 'heart', 'snowflake'], count: ['candle', 5] },
  'toy-box': { title: 'The Toy Box', ground: 'gold-light', back: 'sky', far: 'cream', indoor: true,
    sky: [['kite', 820, 150, 150, { rot: 12 }], ['plane', 240, 130, 190], ['balloon', 560, 170, 120], ['star', 420, 110, 70], ['helicopter', 700, 260, 120]],
    set: ['blocks', 320, 220], set2: ['chair', 780, 170], set3: ['drum', 560, 110],
    mid: ['boat', 'bear', 'top', 'book'], front: ['train', 'wagon', 'wagon', 'ball', 'duck', 'car', 'top', 'bear'],
    corner: ['top', 'ball', 'star', 'blocks'], tiny: ['star', 'heart'], count: ['ball', 6] },
  'little-kitchen': { title: 'Little Kitchen', ground: 'gold-light', back: 'blush', far: 'cream', indoor: true,
    sky: [['teapot', 200, 160, 180], ['cupcake', 820, 160, 130], ['cherries', 520, 130, 110], ['spoon', 680, 240, 90, { rot: 30 }], ['apple', 380, 240, 90]],
    set: ['pot', 330, 230], set2: ['pie', 780, 170], set3: ['bread', 560, 150],
    mid: ['teapot', 'cake', 'bread', 'banana'], front: ['bunny', 'bear', 'pig', 'carrot', 'apple', 'pear', 'spoon', 'cupcake'],
    corner: ['strawberry', 'cherries', 'apple', 'carrot'], tiny: ['cherries', 'strawberry', 'heart'], count: ['strawberry', 7] },
  'funny-pages': { title: 'Funny Pages', ground: 'gold-light', back: 'rose', far: 'cream', indoor: true,
    sky: [['bubble', 220, 150, 220], ['burst', 800, 160, 170], ['bubble-q', 540, 120, 160], ['star', 420, 250, 70], ['bolt', 680, 250, 80]],
    set: ['frog', 330, 220], set2: ['elephant', 780, 180], set3: ['drum', 560, 110],
    mid: ['chair', 'bubble', 'chair', 'mask'], front: ['duck', 'cat', 'banana', 'pig', 'dog', 'mouse', 'drum', 'bunny'],
    corner: ['banana', 'star', 'burst', 'ball'], tiny: ['star', 'heart'], count: ['banana', 5] },
  'round-the-year': { title: 'Round the Year', ground: 'sky-light', back: 'moss', far: 'sky-light', road: true,
    sky: [['sun', 860, 120, 150], ['cloud', 200, 100, 160], ['snowflake', 560, 120, 100], ['leaf', 420, 230, 100, { rot: -20 }], ['umbrella', 700, 230, 120]],
    set: ['tree', 320, 290], set2: ['fir', 790, 210], set3: ['house', 560, 150],
    mid: ['tulip', 'pumpkin', 'snowman', 'leaf', 'daisy'], front: ['penguin', 'frog', 'bunny', 'umbrella', 'snowman', 'pumpkin', 'duck', 'leaf'],
    corner: ['snowflake', 'leaf', 'tulip', 'egg'], tiny: ['snowflake', 'leaf'], count: ['leaf', 8] },
  'game-on': { title: 'Game On', ground: 'moss', back: 'forest-light', far: 'sky-light', bunting: true, road: true,
    sky: [['sun', 860, 110, 140], ['cloud', 200, 100, 160], ['kite', 420, 200, 110, { rot: -10 }], ['ball', 700, 240, 90], ['pennant', 560, 240, 90]],
    set: ['tree', 300, 280], set2: ['tree', 800, 220], set3: ['trafficlight', 560, 70],
    mid: ['pennant', 'cone', 'pennant', 'cone', 'bike'], front: ['fox', 'pig', 'bear', 'football', 'skates', 'bike', 'cone', 'ball'],
    corner: ['football', 'cone', 'ball', 'pennant'], tiny: ['star', 'heart'], count: ['cone', 6] },
  'everyday-heroes': { title: 'Everyday Heroes', ground: 'moss', back: 'forest-light', far: 'sky-light', road: true,
    sky: [['helicopter', 820, 150, 180], ['cloud', 200, 100, 160], ['cape', 460, 210, 130], ['bolt', 680, 230, 80], ['star', 320, 240, 70]],
    set: ['house', 300, 250], set2: ['house', 770, 190, { swap: { red: 'sea', 'red-deep': 'sea-deep' } }], set3: ['tree', 560, 150],
    mid: ['tree', 'trafficlight', 'mailbox', 'shield'], front: ['firetruck', 'dog', 'cat', 'bunny', 'bike', 'cone', 'shield', 'mask'],
    corner: ['star', 'shield', 'heart', 'cone'], tiny: ['star', 'heart', 'bolt'], count: ['star', 7] },
  'on-the-move': { title: 'On the Move', ground: 'moss', back: 'forest-light', far: 'sky-light', road: true,
    sky: [['balloon', 820, 150, 160], ['cloud', 200, 100, 160], ['plane', 480, 170, 190], ['helicopter', 700, 260, 120], ['cloud', 360, 90, 110]],
    set: ['house', 300, 220], set2: ['train', 760, 220], set3: ['tree', 560, 140],
    mid: ['wagon', 'tree', 'trafficlight', 'tree'], front: ['car', 'bus', 'truck', 'bike', 'boat', 'trafficlight', 'cone', 'duck'],
    corner: ['cone', 'pennant', 'tulip', 'ball'], tiny: ['cloud', 'star'], count: ['cloud', 6] },
};

/* ---------- helpers ---------- */
function fit(S, name, { cx, cy, by, w, h }, o = {}) {
  if (!name || !has(name)) return null;
  const k = S.size(name, 100).h / 100;
  const ww = h ? Math.min(w, h / k) : w;
  return S.add(name, by !== undefined ? { cx, by, w: ww, ...o } : { cx, cy, w: ww, ...o });
}
/** Objects along a hill line, evenly spaced with a little jitter; each sinks a bit into the ground. */
function row(S, g, names, { x0, x1, w, sink = 0.1, layer = 1, avoid = [] } = {}) {
  const list = names.filter(has);
  const gap = (x1 - x0) / list.length;
  list.forEach((name, i) => {
    const ww = w[0] + S.rand() * (w[1] - w[0]);
    let cx = x0 + gap * (i + 0.5) + (S.rand() - 0.5) * gap * 0.3;
    if (avoid.some(([a, b]) => cx > a && cx < b)) cx = cx < (avoid[0][0] + avoid[0][1]) / 2 ? avoid[0][0] - ww / 2 : avoid[0][1] + ww / 2;
    const { h } = S.size(name, ww);
    S.add(name, { cx, by: yAt(g, cx) + h * sink, w: ww, layer, flip: S.rand() < 0.4 });
  });
}
function tufts(S, g, n, { dy = [10, 60], x0 = 30, x1 = 970 } = {}) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + S.rand() * (x1 - x0), y = yAt(g, x) + dy[0] + S.rand() * (dy[1] - dy[0]);
    if (S.overlaps([x - 10, y - 14, 20, 16], 2)) continue;
    d += `M${(x - 7).toFixed(1)} ${y.toFixed(1)}q2-9 4-12M${x.toFixed(1)} ${y.toFixed(1)}q0-10 0-15M${(x + 7).toFixed(1)} ${y.toFixed(1)}q-2-9-4-12`;
  }
  S.raw(`<path d="${d}" fill="none" stroke="#16140F" stroke-width="${(S.lw * 0.55).toFixed(2)}" stroke-linecap="round"/>`, 0.6);
}
function craters(S, g, n, dy = [20, 90]) {
  for (let i = 0; i < n; i++) {
    const cx = 40 + S.rand() * 900, rx = 16 + S.rand() * 28;
    const cy = yAt(g, cx) + dy[0] + S.rand() * (dy[1] - dy[0]);
    if (S.overlaps([cx - rx, cy - rx / 3, 2 * rx, rx], 4)) continue;
    S.shape(`M${cx - rx} ${cy}a${rx} ${rx / 3} 0 1 0 ${2 * rx} 0a${rx} ${rx / 3} 0 1 0 ${-2 * rx} 0z`, { fill: 'sea', box: [cx - rx, cy - rx / 3, 2 * rx, (2 * rx) / 3], layer: 0.5 });
  }
}
/** A road or a stream winding from the bottom-left into the middle distance (drawn as one shape). */
function path(S, near, mid, fill, wide) {
  const y0 = H + 10, x0 = 330, xm = 480, ym = yAt(mid, xm) + 10;
  const d = `M${x0 - wide} ${y0}C${x0 + 40} ${y0 - 120} ${xm - 150} ${ym + 60} ${xm - wide * 0.3} ${ym}h${wide * 0.6}C${xm + 80} ${ym + 80} ${x0 + 220} ${y0 - 110} ${x0 + wide} ${y0}z`;
  S.shape(d, { fill, box: [x0 - wide, ym, xm - x0 + wide, y0 - ym], area: wide * 1.1 * (y0 - ym), layer: 0.45 });
}

/* ---------- the layout ---------- */
export function wallScene(S, k, age) {
  const big = age === '3-5';
  const far = hill(S.rand, { x0: -10, x1: W + 10, y: 335, a: 40, n: 5, phase: 0.9, bottom: H + 10 });
  const mid = hill(S.rand, { x0: -10, x1: W + 10, y: 435, a: 26, n: 6, phase: 0.2, bottom: H + 10 });
  const near = hill(S.rand, { x0: -10, x1: W + 10, y: 530, a: 16, n: 6, phase: 2.2, bottom: H + 10 });
  if (k.indoor) {
    // a room: a wall band, a skirting line, a floor
    S.shape(`M-10 300H${W + 10}V${H + 10}H-10z`, { fill: k.far, box: [0, 300, W, 150], area: W * 140, layer: 0 });
    S.shape(mid.d, { fill: k.back, box: [0, mid.top, W, 120], area: W * 100, layer: 0.1 });
    S.shape(near.d, { fill: k.ground, box: [0, near.top, W, H - near.top], area: W * 150, layer: 0.2 });
  } else {
    S.shape(far.d, { fill: k.far, box: [0, far.top, W, 120], area: W * 100, layer: 0 });
    S.shape(mid.d, { fill: k.back, box: [0, mid.top, W, 120], area: W * 95, layer: 0.1 });
    S.shape(near.d, { fill: k.ground, box: [0, near.top, W, H - near.top], area: W * 150, layer: 0.2 });
  }
  if (k.road) path(S, near, mid, 'paper-deep', big ? 70 : 56);
  if (k.stream) path(S, near, mid, 'sky', big ? 60 : 48);
  if (k.space) { craters(S, near, big ? 5 : 9, [30, 110]); craters(S, mid, big ? 3 : 6, [20, 70]); }
  if (k.bunting) fit(S, 'bunting', { cx: 500, cy: 60, w: 900, h: 110 });

  // the sky
  const sk = big ? 1.2 : 1;
  for (const [name, cx, cy, w, o = {}] of k.sky) if (has(name)) S.add(name, { cx, cy: cy + (k.bunting ? 50 : 0), w: w * sk, ...o });

  // set pieces on the middle hill (the house, the big tree, the rocket): the story's place
  const [s1, x1, w1, o1 = {}] = k.set, [s2, x2, w2, o2 = {}] = k.set2, [s3, x3, w3, o3 = {}] = k.set3;
  fit(S, s1, { cx: x1, by: yAt(mid, x1) + 14, w: w1 * (big ? 1.15 : 1), h: yAt(mid, x1) - 150 }, { ...o1, layer: 0.8 });
  fit(S, s2, { cx: x2, by: yAt(mid, x2) + 14, w: w2 * (big ? 1.1 : 1), h: yAt(mid, x2) - 170 }, { ...o2, layer: 0.8 });
  fit(S, s3, { cx: x3, by: yAt(far, x3) + 10, w: w3 * (big ? 1.15 : 1), h: yAt(far, x3) - 120 }, { ...o3, layer: 0.7 });

  // Pim hides behind the right set piece (layer below it), peeking out
  const px = x2 + w2 * 0.46, pw = big ? 70 : 56;
  if (has('pim-full')) S.add('pim-full', { cx: px, by: yAt(mid, px) + 12, w: pw, layer: 0.75 });

  // the middle hill: smaller things between the set pieces
  const midNames = big ? k.mid.slice(0, 3) : k.mid;
  row(S, mid, midNames, { x0: 60, x1: 940, w: big ? [90, 120] : [60, 90], sink: 0.1, layer: 0.85, avoid: [[x1 - w1 / 2 - 10, x1 + w1 / 2 + 10]] });

  // the near ground: the characters, biggest, left to right
  const frontNames = big ? k.front.slice(0, 5) : k.front;
  row(S, near, frontNames, { x0: 40, x1: 720, w: big ? [130, 175] : [85, 120], sink: 0.14, layer: 1 });

  // front corners: small things; the right corner stays clear for the title plate (x > 720, y > 590)
  S.scatter(k.corner.filter(has), big ? 2 : 4, [30, 560, 230, 70], big ? [48, 64] : [36, 50], { pad: 8, rot: 10 });
  S.scatter(k.corner.filter(has), big ? 1 : 3, [500, 560, 220, 50], big ? [48, 64] : [36, 50], { pad: 8, rot: 10 });

  // things to find and count: in the sky, then on the ground
  const [cname, cn] = k.count;
  if (has(cname)) S.scatter([cname], cn, k.space ? [30, 30, 940, 260] : [30, 40, 940, 230], big ? [32, 44] : [24, 34], { pad: 14, rot: 20 });
  S.scatter(k.tiny.filter(has), big ? 4 : 10, [30, 30, 940, far.top - 20], big ? [34, 46] : [24, 36], { pad: 14, rot: 24, flip: true });
  if (!k.space && !k.indoor) { tufts(S, mid, big ? 14 : 22, { dy: [20, 70] }); tufts(S, near, big ? 10 : 18, { dy: [20, 60], x1: 700 }); }
  if (k.space) S.scatter(['star'], big ? 10 : 24, [30, 30, 940, 250], [14, 26], { pad: 10, rot: 20 });
}

export const WALLS = Object.fromEntries(Object.entries(KITS).map(([key, k]) => [key, { title: k.title, '3-5': (S) => wallScene(S, k, '3-5'), '5-7': (S) => wallScene(S, k, '5-7') }]));
export { has };
