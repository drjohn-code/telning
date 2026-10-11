// Giant colouring poster scenes, one per series and age. Units: mm on a 700 × 1000 sheet.
// Ages 3–5: 8–14 big shapes with thick lines. Ages 5–7: 40–70 smaller shapes and more detail.
// One layout engine, one kit per series: what stands on the ground, what flies in the sky, what fills the corners.
// The title ribbon sits at y 872–960 in the middle, so only the two bottom corners hold small things there.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../lib/svg.mjs';
import { hill, yAt } from '../lib/poster.mjs';

const has = (n) => existsSync(join(ROOT, 'art/objects', `${n}.svg`)) || existsSync(join(ROOT, 'art/animals', `${n}.svg`));

/* the kits: names only; sizes come from the layout */
const KITS = {
  'home-hearts': {
    s35: ['cloud','sun','kite','heart','balloon','house','tree','cat','dog','tulip'], far57: [['house', 190], ['tree', 150], ['house', 170, { swap: { red: 'gold', 'red-deep': 'gold-deep' } }]],
    title: 'Home & Hearts', ground: 'moss', back: 'forest-light',
    sky35: [['sun', 560, 150, 190], ['cloud', 170, 160, 230], ['heart', 360, 330, 90], ['kite', 600, 430, 120, { rot: 10 }], ['balloon', 120, 430, 130]],
    row35: [['tree', 150], ['house', 290], ['cat', 130], ['dog', 120]],
    sky57: [['sun', 590, 110, 120], ['cloud', 170, 100, 150], ['kite', 420, 220, 80, { rot: 12 }]],
    skyMix57: ['balloon', 'partyballoon', 'heart', 'cloud', 'plane', 'kite', 'bee', 'butterfly'], tiny57: ['heart', 'star', 'bee'],
    back57: [['house', 150], ['tree', 90], ['house', 130, { swap: { red: 'sea', 'red-deep': 'sea-deep' } }], ['tree', 80], ['house', 140, { swap: { red: 'gold', 'red-deep': 'gold-deep' } }]],
    front57: [['mailbox', 60], ['dog', 80], ['bike', 110], ['cat', 70], ['chair', 60], ['bunny', 66], ['seesaw', 120]],
    corner57: ['tulip', 'daisy', 'heart', 'ball', 'snail'],
  },
  'paws-claws': {
    s35: ['cloud','sun','owl','bee','butterfly','bear','tree','fox','bunny','frog'], far57: [['tree', 170], ['tree', 140], ['tree', 180]],
    title: 'Paws & Claws', ground: 'moss', back: 'forest-light', pond: true,
    sky35: [['sun', 570, 150, 180], ['cloud', 180, 150, 220], ['owl', 360, 360, 130], ['bee', 150, 420, 90], ['butterfly', 590, 440, 120]],
    row35: [['fox', 140], ['tree', 170], ['bear', 150], ['bunny', 110]],
    sky57: [['sun', 600, 100, 110], ['cloud', 160, 100, 150]],
    skyMix57: ['owl', 'bat', 'butterfly', 'bee', 'cloud', 'ladybird', 'duck'], tiny57: ['bee', 'butterfly', 'ladybird'],
    back57: [['tree', 110], ['sheep', 100], ['pig', 100], ['tree', 90], ['elephant', 110], ['tree', 100]],
    front57: [['fox', 80], ['bear', 82], ['bunny', 64], ['dog', 76], ['hedgehog', 74], ['frog', 66], ['mouse', 56], ['turtle', 80]],
    corner57: ['snail', 'mushroom', 'paw', 'daisy', 'ladybird'],
  },
  'star-hoppers': {
    s35: ['moon','planet','comet','star','saucer','rocket','penguin','bear','star','pennant'], far57: [['planet', 180], ['rocket', 110], ['satellite', 160]],
    title: 'Star Hoppers', ground: 'sky', back: 'sea', far: 'sky-light', space: true,
    sky35: [['planet', 500, 200, 330], ['moon', 135, 150, 175, { rot: -10 }], ['comet', 170, 430, 210], ['saucer', 560, 520, 200]],
    row35: [['penguin', 150], ['rocket', 150], ['bear', 160]],
    sky57: [['planet', 540, 150, 210], ['moon', 120, 110, 110, { rot: -10 }], ['sun', 330, 110, 90]],
    skyMix57: ['planet', 'comet', 'saucer', 'satellite', 'rocket', 'moon', 'star'], tiny57: ['star'],
    back57: [['telescope', 90], ['rocket', 80], ['pennant', 50], ['elephant', 90]],
    front57: [['penguin', 80], ['rocket', 90], ['owl', 76], ['penguin', 64], ['bunny', 66], ['saucer', 110], ['ball', 40]],
    corner57: ['star', 'star', 'ball', 'star'],
  },
  'little-gardeners': {
    s35: ['cloud','sun','butterfly','bee','ladybird','wateringcan','tulip','tree','snail','daisy'], far57: [['tree', 180], ['tree', 150], ['tree', 170]],
    title: 'Little Gardeners', ground: 'moss', back: 'forest-light',
    sky35: [['sun', 560, 160, 200], ['cloud', 180, 150, 230], ['butterfly', 360, 380, 130], ['bee', 150, 440, 90], ['ladybird', 600, 470, 90]],
    row35: [['tulip', 110], ['wateringcan', 210], ['snail', 130], ['daisy', 100], ['tree', 150]],
    sky57: [['sun', 590, 110, 120], ['cloud', 170, 100, 150], ['cloud', 400, 170, 110]],
    skyMix57: ['butterfly', 'bee', 'ladybird', 'cloud', 'kite', 'bat'], tiny57: ['bee', 'butterfly', 'ladybird'],
    back57: [['tree', 110], ['tulip', 60], ['daisy', 56], ['tree', 90], ['tulip', 60], ['mushroom', 70], ['tree', 100]],
    front57: [['wateringcan', 100], ['carrot', 50], ['strawberry', 56], ['snail', 70], ['frog', 66], ['pear', 56], ['hedgehog', 74], ['mushroom', 60]],
    corner57: ['daisy', 'tulip', 'ladybird', 'mushroom', 'cherries'],
  },
  'big-days': {
    s35: ['balloon','firework','star','partyballoon','star','cake','gift','present','candle','egg'], far57: [['fir', 170], ['house', 180], ['fir', 150]],
    title: 'Big Days', ground: 'blush', back: 'rose', bunting35: true,
    sky35: [['bunting', 350, 120, 560], ['balloon', 130, 330, 150], ['partyballoon', 580, 330, 110], ['star', 360, 330, 70], ['firework', 380, 470, 150]],
    row35: [['gift', 140], ['cake', 220], ['present', 110], ['duck', 110]],
    sky57: [['bunting', 350, 118, 480], ['moon', 120, 190, 90], ['firework', 560, 210, 130]],
    skyMix57: ['balloon', 'partyballoon', 'firework', 'bat', 'star', 'snowflake', 'butterfly'], tiny57: ['star', 'snowflake', 'heart'],
    back57: [['fir', 100], ['lantern', 80], ['pumpkin', 80], ['fir', 90], ['house', 120]],
    front57: [['cake', 110], ['present', 66], ['egg', 46], ['bunny', 66], ['gift', 80], ['candle', 46], ['snowman', 80], ['egg', 40]],
    corner57: ['egg', 'cupcake', 'candle', 'pumpkin', 'daisy'],
  },
  'toy-box': {
    s35: ['plane','kite','balloon','star','rocket','blocks','bear','train','ball','duck'], far57: [['blocks', 170], ['rocket', 100], ['blocks', 150]],
    title: 'The Toy Box', ground: 'gold-light', back: 'sky', indoor: true,
    sky35: [['kite', 560, 200, 170, { rot: 12 }], ['plane', 190, 170, 220], ['balloon', 360, 380, 130], ['star', 150, 420, 80], ['rocket', 600, 480, 90, { rot: 20 }]],
    row35: [['blocks', 190], ['bear', 150], ['ball', 120], ['train', 200]],
    sky57: [['kite', 580, 120, 110, { rot: 12 }], ['plane', 180, 110, 150]],
    skyMix57: ['balloon', 'kite', 'rocket', 'helicopter', 'star', 'plane', 'top'], tiny57: ['star', 'heart'],
    back57: [['blocks', 120], ['chair', 80], ['bear', 96], ['drum', 80], ['boat', 90]],
    front57: [['train', 140], ['wagon', 100], ['wagon', 100], ['top', 60], ['ball', 60], ['duck', 66], ['car', 100]],
    corner57: ['top', 'ball', 'star', 'blocks', 'duck'],
  },
  'little-kitchen': {
    s35: ['teapot','cupcake','cherries','apple','pear','pot','bread','carrot','strawberry','banana'], far57: [['teapot', 170], ['cake', 160], ['pot', 170]],
    title: 'Little Kitchen', ground: 'gold-light', back: 'blush', indoor: true,
    sky35: [['teapot', 180, 200, 230], ['cupcake', 540, 200, 150], ['cherries', 360, 380, 110], ['apple', 140, 450, 110], ['banana', 580, 450, 130]],
    row35: [['pot', 220], ['carrot', 90], ['bread', 190], ['pear', 100]],
    sky57: [['teapot', 160, 130, 150], ['pie', 540, 140, 150]],
    skyMix57: ['cupcake', 'cherries', 'apple', 'strawberry', 'banana', 'pear', 'spoon'], tiny57: ['cherries', 'strawberry', 'heart'],
    back57: [['pot', 120], ['teapot', 100], ['bread', 110], ['cake', 100]],
    front57: [['bunny', 70], ['bear', 80], ['pig', 80], ['pie', 100], ['carrot', 46], ['apple', 50], ['pear', 50], ['spoon', 60]],
    corner57: ['strawberry', 'cherries', 'apple', 'carrot', 'banana'],
  },
  'funny-pages': {
    s35: ['bubble','burst','bubble-q','star','heart','frog','duck','cat','banana','star'], far57: [['bubble', 190], ['burst', 150], ['bubble-q', 170]],
    title: 'Funny Pages', ground: 'gold-light', back: 'rose', indoor: true,
    sky35: [['bubble', 190, 170, 250], ['burst', 540, 200, 200], ['bubble-q', 520, 450, 170], ['star', 160, 440, 80]],
    row35: [['frog', 170], ['duck', 140], ['cat', 140], ['banana', 120]],
    sky57: [['bubble', 170, 110, 160], ['burst', 550, 120, 140], ['bubble-q', 360, 230, 120]],
    skyMix57: ['bubble', 'bubble-q', 'burst', 'star', 'mask', 'bolt'], tiny57: ['star', 'heart'],
    back57: [['chair', 80], ['bubble', 110], ['elephant', 100], ['chair', 80]],
    front57: [['frog', 80], ['duck', 70], ['cat', 70], ['banana', 56], ['pig', 76], ['dog', 70], ['mouse', 56], ['drum', 60]],
    corner57: ['banana', 'star', 'burst', 'bubble'],
  },
  'round-the-year': {
    s35: ['cloud','sun','snowflake','leaf','umbrella','snowman','tree','pumpkin','tulip','leaf'], far57: [['fir', 160], ['tree', 180], ['fir', 150]],
    title: 'Round the Year', ground: 'sky-light', back: 'moss',
    sky35: [['sun', 560, 160, 180], ['cloud', 180, 160, 230], ['snowflake', 360, 360, 110], ['leaf', 160, 430, 110, { rot: -20 }], ['umbrella', 590, 460, 140]],
    row35: [['snowman', 160], ['tulip', 110], ['tree', 160], ['pumpkin', 130]],
    sky57: [['sun', 590, 110, 110], ['cloud', 170, 100, 150], ['cloud', 400, 150, 120]],
    skyMix57: ['snowflake', 'leaf', 'kite', 'butterfly', 'umbrella', 'cloud', 'bee'], tiny57: ['snowflake', 'leaf'],
    back57: [['fir', 90], ['tree', 100], ['tulip', 60], ['tree', 90], ['fir', 80], ['house', 120]],
    front57: [['snowman', 90], ['umbrella', 80], ['pumpkin', 70], ['daisy', 50], ['penguin', 64], ['frog', 60], ['leaf', 50], ['bunny', 64]],
    corner57: ['snowflake', 'leaf', 'tulip', 'egg', 'mushroom'],
  },
  'game-on': {
    s35: ['cloud','sun','kite','ball','pennant','bike','fox','football','cone','ball'], far57: [['tree', 170], ['trafficlight', 60], ['tree', 160]],
    title: 'Game On', ground: 'moss', back: 'forest-light',
    sky35: [['sun', 570, 150, 170], ['cloud', 180, 150, 220], ['pennant', 360, 330, 110], ['kite', 150, 430, 120, { rot: -10 }], ['ball', 580, 440, 110]],
    row35: [['football', 140], ['fox', 140], ['cone', 100], ['bike', 220]],
    sky57: [['sun', 600, 100, 100], ['cloud', 170, 100, 150], ['bunting', 380, 220, 420]],
    skyMix57: ['ball', 'kite', 'cloud', 'pennant', 'balloon', 'bee'], tiny57: ['star', 'heart'],
    back57: [['pennant', 60], ['tree', 100], ['cone', 50], ['tree', 90], ['pennant', 60], ['trafficlight', 40]],
    front57: [['bike', 120], ['skates', 66], ['football', 56], ['fox', 76], ['pig', 76], ['bear', 80], ['cone', 50], ['ball', 50]],
    corner57: ['football', 'cone', 'ball', 'skates', 'pennant'],
  },
  'everyday-heroes': {
    s35: ['cloud','helicopter','cape','bolt','star','firetruck','tree','dog','cat','shield'], far57: [['house', 190], ['tree', 150], ['house', 170, { swap: { red: 'sea', 'red-deep': 'sea-deep' } }]],
    title: 'Everyday Heroes', ground: 'moss', back: 'forest-light',
    sky35: [['helicopter', 540, 190, 220], ['cloud', 170, 150, 210], ['cape', 360, 380, 160], ['bolt', 150, 440, 80], ['star', 600, 460, 80]],
    row35: [['tree', 170], ['firetruck', 280], ['dog', 120]],
    sky57: [['helicopter', 560, 120, 150], ['cloud', 160, 100, 140], ['cape', 360, 200, 110]],
    skyMix57: ['bolt', 'star', 'shield', 'mask', 'cape', 'cloud', 'plane'], tiny57: ['star', 'heart', 'bolt'],
    back57: [['house', 140], ['tree', 90], ['house', 120, { swap: { red: 'sea', 'red-deep': 'sea-deep' } }], ['trafficlight', 40], ['tree', 90]],
    front57: [['firetruck', 160], ['dog', 70], ['cat', 66], ['shield', 60], ['bike', 100], ['bunny', 60], ['cone', 46]],
    corner57: ['star', 'shield', 'heart', 'bolt', 'cone'],
  },
  'on-the-move': {
    s35: ['cloud','balloon','plane','helicopter','kite','car','trafficlight','bus','bike','boat'], far57: [['tree', 150], ['house', 180], ['tree', 140]],
    title: 'On the Move', ground: 'moss', back: 'forest-light', road: true,
    sky35: [['balloon', 560, 200, 190], ['cloud', 190, 150, 230], ['plane', 360, 380, 200], ['helicopter', 140, 470, 150]],
    row35: [['trafficlight', 60], ['car', 230], ['bus', 220]],
    sky57: [['balloon', 580, 130, 120], ['cloud', 170, 100, 150], ['plane', 360, 200, 140]],
    skyMix57: ['balloon', 'helicopter', 'plane', 'cloud', 'kite', 'rocket'], tiny57: ['cloud', 'star'],
    back57: [['train', 130], ['wagon', 90], ['wagon', 90], ['tree', 80], ['house', 110]],
    front57: [['car', 110], ['bus', 120], ['trafficlight', 34], ['truck', 120], ['bike', 90], ['boat', 80]],
    corner57: ['cone', 'pennant', 'trafficlight', 'tulip'],
  },
};

/** Place a row of objects along a hill, left to right, evenly spaced (with a little jitter). */
function row(S, g, items, { x0 = 40, x1 = 660, sink = 0.08, scale = 1 } = {}) {
  let ws = items.map(([, w]) => w * scale);
  let total = ws.reduce((a, b) => a + b, 0);
  const span = (x1 - x0) * 0.96;
  if (total > span) { ws = ws.map((w) => (w * span) / total); total = span; }
  const gap = Math.max(0, (x1 - x0 - total) / Math.max(1, items.length - 1));
  let x = x0;
  items.forEach(([name, w, o = {}], i) => {
    if (!has(name)) { x += ws[i] + gap; return; }
    const ww = ws[i];
    const cx = x + ww / 2 + (S.rand() - 0.5) * gap * 0.3;
    const { h } = S.size(name, ww);
    S.add(name, { cx, by: yAt(g, cx) + h * sink, w: ww, ...o });
    x += ww + gap;
  });
}

/** Fit an object into a box (w × h) and place it by centre or by bottom. */
function slot(S, name, { cx, cy, by, w, h }, o = {}) {
  if (!name || !has(name)) return;
  const r = S.size(name, 100).h / 100;           // height per width
  const ww = Math.min(w, h / r);
  S.add(name, by !== undefined ? { cx, by, w: ww, ...o } : { cx, cy, w: ww, ...o });
}

/** Grass tufts (thin ink strokes) scattered along a band, for texture in the line art. */
function tufts(S, g, n, { dy = [14, 80], x0 = 10, x1 = 690 } = {}) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + S.rand() * (x1 - x0);
    const y = yAt(g, x) + dy[0] + S.rand() * (dy[1] - dy[0]);
    if (S.overlaps([x - 10, y - 14, 20, 16], 2)) continue;
    d += `M${(x - 7).toFixed(1)} ${y.toFixed(1)}q2-9 4-12M${x.toFixed(1)} ${y.toFixed(1)}q0-10 0-15M${(x + 7).toFixed(1)} ${y.toFixed(1)}q-2-9-4-12`;
  }
  S.raw(`<path d="${d}" fill="none" stroke="#16140F" stroke-width="${S.lw * 0.6}" stroke-linecap="round"/>`, 0.6);
}
function craters(S, g, n, dy = [20, 120]) {
  for (let i = 0; i < n; i++) {
    const cx = 30 + S.rand() * 640, rx = 14 + S.rand() * 26;
    const cy = yAt(g, cx) + dy[0] + S.rand() * (dy[1] - dy[0]);
    if (S.overlaps([cx - rx, cy - rx / 3, 2 * rx, rx], 4)) continue;
    S.shape(`M${cx - rx} ${cy}a${rx} ${rx / 3} 0 1 0 ${2 * rx} 0a${rx} ${rx / 3} 0 1 0 ${-2 * rx} 0z`, { fill: 'sea', box: [cx - rx, cy - rx / 3, 2 * rx, (2 * rx) / 3], layer: 0.5 });
  }
}

/* 3–5: ten slots, big shapes. Slots A–E in the sky, F (the hero), G and H on the hill, I and J in front. */
const SLOTS = {
  A: { cx: 170, cy: 175, w: 270, h: 220 }, B: { cx: 520, cy: 200, w: 300, h: 270 }, C: { cx: 350, cy: 365, w: 220, h: 165 },
  D: { cx: 100, cy: 470, w: 150, h: 150 }, E: { cx: 605, cy: 490, w: 150, h: 150 },
};
function poster35(S, k) {
  const g = hill(S.rand, { y: 715, a: 30, n: 3, phase: 1 });
  S.shape(g.d, { fill: k.ground, box: [0, g.top, 700, 1000 - g.top], area: 700 * 270 });
  if (k.space) craters(S, g, 4, [110, 150]);
  if (k.pond) S.shape('M440 852c40-26 190-26 230 0s-30 34-115 34-155-8-115-34z', { fill: 'sky', box: [440, 830, 230, 56], layer: 0.5 });
  if (k.road) S.shape(`M-10 ${yAt(g, 0) + 120}C200 ${yAt(g, 200) + 100} 480 ${yAt(g, 480) + 130} 710 ${yAt(g, 700) + 110}V${yAt(g, 700) + 160}C480 ${yAt(g, 480) + 180} 200 ${yAt(g, 200) + 150} -10 ${yAt(g, 0) + 170}Z`, { fill: 'paper-deep', box: [0, 820, 700, 60], layer: 0.5 });
  const [A, B, C, D, E, F, G, H, I, J] = k.s35;
  if (k.bunting35) slot(S, 'bunting', { cx: 350, cy: 95, w: 600, h: 120 });
  slot(S, A, k.bunting35 ? { ...SLOTS.A, cy: 290, h: 180 } : SLOTS.A); slot(S, B, k.bunting35 ? { ...SLOTS.B, cy: 300, h: 200 } : SLOTS.B);
  slot(S, C, k.bunting35 ? { ...SLOTS.C, cy: 500 } : SLOTS.C); slot(S, D, SLOTS.D); slot(S, E, SLOTS.E);
  slot(S, G, { cx: 125, by: yAt(g, 125) + 40, w: 210, h: 280 });
  slot(S, H, { cx: 580, by: yAt(g, 580) + 46, w: 210, h: 250 });
  slot(S, F, { cx: 352, by: yAt(g, 352) + 70, w: 330, h: 320 });
  slot(S, I, { cx: 92, by: 866, w: 130, h: 115 });
  slot(S, J, { cx: 608, by: 866, w: 130, h: 115 });
}

/* 5–7: three ground layers, landmarks, rows, texture, then the sky. */
function poster57(S, k) {
  const far = hill(S.rand, { y: 560, a: 60, n: 4, phase: 0.9 });
  const mid = hill(S.rand, { y: 680, a: 34, n: 5, phase: 0.2 });
  const near = hill(S.rand, { y: 790, a: 22, n: 5, phase: 2.2 });
  S.shape(far.d, { fill: k.far || 'sky-light', box: [0, far.top, 700, 300], area: 700 * 120, layer: 0 });
  S.shape(mid.d, { fill: k.back, box: [0, mid.top, 700, 300], area: 700 * 110, layer: 0.1 });
  S.shape(near.d, { fill: k.ground, box: [0, near.top, 700, 1000 - near.top], area: 700 * 200, layer: 0.2 });
  if (k.road) S.shape(`M-10 ${yAt(near, 0) + 40}C200 ${yAt(near, 200) + 26} 480 ${yAt(near, 480) + 50} 710 ${yAt(near, 700) + 36}V${yAt(near, 700) + 74}C480 ${yAt(near, 480) + 90} 200 ${yAt(near, 200) + 64} -10 ${yAt(near, 0) + 80}Z`, { fill: 'paper-deep', box: [0, 820, 700, 50], layer: 0.5 });
  if (k.pond) S.shape('M440 866c36-22 170-22 206 0s-26 30-103 30-139-8-103-30z', { fill: 'sky', box: [440, 846, 206, 50], layer: 0.5 });
  if (k.space) { craters(S, near, 6, [30, 80]); craters(S, mid, 4, [20, 70]); }
  for (const [name, cx, cy, w, o = {}] of k.sky57) if (has(name)) S.add(name, { cx, cy, w: w * 1.15, ...o });
  row(S, far, k.far57 || [], { x0: 30, x1: 670, sink: 0.12 });
  row(S, mid, k.back57, { x0: 18, x1: 682, sink: 0.12, scale: 1.2 });
  row(S, near, k.front57, { x0: 14, x1: 686, sink: 0.16, scale: 1.15 });
  if (!k.space) { tufts(S, mid, 26, { dy: [30, 100] }); tufts(S, near, 20, { dy: [40, 80] }); }
  S.scatter(k.corner57.filter(has), 4, [14, 862, 150, 100], [34, 50], { pad: 6 });
  S.scatter(k.corner57.filter(has), 4, [546, 862, 140, 100], [34, 50], { pad: 6 });
  S.scatter(k.skyMix57.filter(has), 9, [10, 30, 680, far.top - 60], [70, 116], { pad: 16, rot: 12, flip: true });
  S.scatter(k.tiny57.filter(has), k.space ? 24 : 6, [10, 10, 680, far.top - 20], [22, 36], { pad: 12, rot: 24 });
}

export const POSTERS = Object.fromEntries(Object.entries(KITS).map(([key, k]) => [key, {
  title: k.title,
  '3-5': (S) => poster35(S, k),
  '5-7': (S) => poster57(S, k),
}]));

export { has, KITS };
