// Front-cover scenes, one per series and age (units: mm on the 222.25 mm square cover; the title sits above y ≈ 95).
// Objects marked c: true are in colour; the rest is cream line art on the green, ready to colour.
// 3–5: one big object and a few friends. 5–7: more, smaller things.
import { hill, yAt } from '../lib/poster.mjs';

const ground = (S, y, a = 6, fill = 'forest-light') => {
  const g = hill(S.rand, { x0: -4, x1: 226, y: y - 4, a: a + 3, n: 3, bottom: 230 });
  S.shape(g.d, { fill, colour: true, box: [0, y, 222, 50] });
  return g;
};
// every object a little bigger than placed (K), anchored where it was placed
const K = 1.32;
const put = (S, list) => list.forEach(([name, o]) => S.add(name, { ...o, w: o.w * (name === 'bunting' ? 1 : K), colour: !!o.c }));
const on = (g, x, sink = 2) => yAt(g, x) + sink;

export const COVERS = {
  'home-hearts': {
    '3-5'(S) { const g = ground(S, 192); put(S, [['sun', { cx: 190, cy: 112, w: 30 }], ['heart', { cx: 150, cy: 122, w: 14, c: 1 }], ['heart', { cx: 128, cy: 110, w: 9 }], ['house', { cx: 112, by: on(g, 112, 4), w: 82 }], ['cat', { cx: 186, by: on(g, 186, 6), w: 38, c: 1 }], ['tree', { cx: 36, by: on(g, 36, 4), w: 40 }]]); },
    '5-7'(S) { const g = ground(S, 190); put(S, [['kite', { cx: 186, cy: 112, w: 20, rot: 12, c: 1 }], ['cloud', { cx: 140, cy: 108, w: 30 }], ['house', { cx: 62, by: on(g, 62, 4), w: 56 }], ['house', { cx: 126, by: on(g, 126, 4), w: 46, swap: { red: 'sea', 'red-deep': 'sea-deep' }, c: 1 }], ['tree', { cx: 168, by: on(g, 168, 3), w: 26 }], ['mailbox', { cx: 200, by: on(g, 200, 3), w: 16 }], ['dog', { cx: 20, by: on(g, 20, 6), w: 24 }], ['bunny', { cx: 150, by: on(g, 150, 8), w: 20, c: 1 }], ['balloon', { cx: 30, cy: 120, w: 18 }]]); },
  },
  'paws-claws': {
    '3-5'(S) { const g = ground(S, 194); put(S, [['sun', { cx: 194, cy: 112, w: 26 }], ['tree', { cx: 34, by: on(g, 34, 4), w: 46 }], ['fox', { cx: 98, by: on(g, 98, 8), w: 58, c: 1 }], ['bear', { cx: 160, by: on(g, 160, 8), w: 50 }], ['bee', { cx: 140, cy: 116, w: 18, c: 1 }]]); },
    '5-7'(S) { const g = ground(S, 192); put(S, [['owl', { cx: 30, cy: 128, w: 26, c: 1 }], ['tree', { cx: 52, by: on(g, 52, 4), w: 34 }], ['fox', { cx: 94, by: on(g, 94, 7), w: 34 }], ['bunny', { cx: 126, by: on(g, 126, 8), w: 26, c: 1 }], ['duck', { cx: 154, by: on(g, 154, 6), w: 26 }], ['frog', { cx: 186, by: on(g, 186, 6), w: 26 }], ['snail', { cx: 206, by: on(g, 206, 4), w: 18 }], ['butterfly', { cx: 170, cy: 118, w: 18, c: 1 }], ['bee', { cx: 110, cy: 114, w: 14 }]]); },
  },
  'star-hoppers': {
    '3-5'(S) { const g = ground(S, 196, 5, 'sea-deep'); put(S, [['moon', { cx: 186, cy: 120, w: 34, c: 1 }], ['star', { cx: 150, cy: 108, w: 10 }], ['star', { cx: 30, cy: 124, w: 9 }], ['star', { cx: 200, cy: 158, w: 8 }], ['rocket', { cx: 104, by: on(g, 104, 6), w: 44 }], ['planet', { cx: 46, cy: 156, w: 56 }], ['penguin', { cx: 160, by: on(g, 160, 6), w: 34, c: 1 }]]); },
    '5-7'(S) { const g = ground(S, 194, 5, 'sea-deep'); put(S, [['planet', { cx: 176, cy: 116, w: 46, c: 1 }], ['comet', { cx: 40, cy: 122, w: 34 }], ['saucer', { cx: 112, cy: 120, w: 30 }], ['star', { cx: 80, cy: 108, w: 8 }], ['star', { cx: 140, cy: 146, w: 7 }], ['star', { cx: 210, cy: 150, w: 7 }], ['rocket', { cx: 72, by: on(g, 72, 6), w: 28, c: 1 }], ['telescope', { cx: 26, by: on(g, 26, 4), w: 26 }], ['penguin', { cx: 112, by: on(g, 112, 6), w: 22 }], ['owl', { cx: 146, by: on(g, 146, 6), w: 22 }], ['bunny', { cx: 182, by: on(g, 182, 7), w: 20 }]]); },
  },
  'little-gardeners': {
    '3-5'(S) { const g = ground(S, 194); put(S, [['sun', { cx: 188, cy: 116, w: 30, c: 1 }], ['tulip', { cx: 70, by: on(g, 70, 4), w: 34, c: 1 }], ['tulip', { cx: 100, by: on(g, 100, 4), w: 28 }], ['wateringcan', { cx: 156, by: on(g, 156, 4), w: 50 }], ['bee', { cx: 120, cy: 120, w: 18 }], ['snail', { cx: 26, by: on(g, 26, 4), w: 30 }]]); },
    '5-7'(S) { const g = ground(S, 192); put(S, [['butterfly', { cx: 40, cy: 118, w: 24, c: 1 }], ['cloud', { cx: 178, cy: 110, w: 34 }], ['daisy', { cx: 24, by: on(g, 24, 4), w: 18 }], ['tulip', { cx: 48, by: on(g, 48, 4), w: 20 }], ['mushroom', { cx: 76, by: on(g, 76, 4), w: 24, c: 1 }], ['carrot', { cx: 104, by: on(g, 104, 8), w: 18 }], ['wateringcan', { cx: 140, by: on(g, 140, 4), w: 34 }], ['ladybird', { cx: 176, by: on(g, 176, 4), w: 18 }], ['strawberry', { cx: 200, by: on(g, 200, 4), w: 18, c: 1 }], ['bee', { cx: 104, cy: 126, w: 14 }]]); },
  },
  'big-days': {
    '3-5'(S) { const g = ground(S, 196); put(S, [['bunting', { cx: 111, cy: 116, w: 170 }], ['cake', { cx: 106, by: on(g, 106, 4), w: 62, c: 1 }], ['balloon', { cx: 30, cy: 140, w: 34 }], ['gift', { cx: 172, by: on(g, 172, 4), w: 40 }], ['duck', { cx: 205, by: on(g, 205, 4), w: 26, c: 1 }]]); },
    '5-7'(S) { const g = ground(S, 194); put(S, [['firework', { cx: 186, cy: 116, w: 34, c: 1 }], ['moon', { cx: 30, cy: 116, w: 22 }], ['lantern', { cx: 30, by: on(g, 30, 4), w: 32, c: 1 }], ['pumpkin', { cx: 62, by: on(g, 62, 4), w: 26 }], ['fir', { cx: 104, by: on(g, 104, 4), w: 34 }], ['egg', { cx: 140, by: on(g, 140, 4), w: 16 }], ['present', { cx: 166, by: on(g, 166, 4), w: 24 }], ['bat', { cx: 112, cy: 120, w: 24 }], ['candle', { cx: 196, by: on(g, 196, 4), w: 14 }]]); },
  },
  'toy-box': {
    '3-5'(S) { const g = ground(S, 196, 3, 'gold-deep'); put(S, [['kite', { cx: 188, cy: 120, w: 30, rot: 10, c: 1 }], ['blocks', { cx: 70, by: on(g, 70, 4), w: 54 }], ['ball', { cx: 132, by: on(g, 132, 2), w: 36, c: 1 }], ['bear', { cx: 180, by: on(g, 180, 4), w: 40 }], ['star', { cx: 24, cy: 120, w: 10 }]]); },
    '5-7'(S) { const g = ground(S, 196, 3, 'gold-deep'); put(S, [['top', { cx: 30, by: on(g, 30, 4), w: 20, c: 1 }], ['train', { cx: 80, by: on(g, 80, 4), w: 50 }], ['wagon', { cx: 128, by: on(g, 128, 4), w: 36, c: 1 }], ['drum', { cx: 170, by: on(g, 170, 4), w: 26 }], ['duck', { cx: 202, by: on(g, 202, 4), w: 20 }], ['boat', { cx: 186, cy: 126, w: 26 }], ['kite', { cx: 40, cy: 120, w: 20, rot: -10 }], ['ball', { cx: 112, cy: 128, w: 16, c: 1 }]]); },
  },
  'little-kitchen': {
    '3-5'(S) { const g = ground(S, 198, 2, 'gold-deep'); put(S, [['pot', { cx: 82, by: on(g, 82, 4), w: 62, c: 1 }], ['carrot', { cx: 142, by: on(g, 142, 4), w: 22, rot: 20 }], ['apple', { cx: 180, by: on(g, 180, 4), w: 30, c: 1 }], ['teapot', { cx: 186, cy: 130, w: 36 }], ['pear', { cx: 28, by: on(g, 28, 4), w: 26 }]]); },
    '5-7'(S) { const g = ground(S, 198, 2, 'gold-deep'); put(S, [['teapot', { cx: 40, by: on(g, 40, 4), w: 38 }], ['bread', { cx: 88, by: on(g, 88, 4), w: 34, c: 1 }], ['pie', { cx: 134, by: on(g, 134, 4), w: 36 }], ['cherries', { cx: 174, by: on(g, 174, 4), w: 22, c: 1 }], ['banana', { cx: 204, by: on(g, 204, 4), w: 24 }], ['strawberry', { cx: 120, cy: 132, w: 16 }], ['spoon', { cx: 186, cy: 128, w: 26 }], ['cupcake', { cx: 70, cy: 128, w: 18 }]]); },
  },
  'funny-pages': {
    '3-5'(S) { const g = ground(S, 198, 3, 'red-deep'); put(S, [['burst', { cx: 172, cy: 126, w: 46, c: 1 }], ['bubble', { cx: 60, cy: 128, w: 54 }], ['frog', { cx: 104, by: on(g, 104, 6), w: 54, c: 1 }], ['duck', { cx: 176, by: on(g, 176, 4), w: 32 }]]); },
    '5-7'(S) { const g = ground(S, 198, 3, 'red-deep'); put(S, [['bubble-q', { cx: 40, cy: 124, w: 40, c: 1 }], ['burst', { cx: 116, cy: 120, w: 30 }], ['bubble', { cx: 184, cy: 124, w: 38 }], ['banana', { cx: 120, by: on(g, 120, 4), w: 22 }], ['duck', { cx: 152, by: on(g, 152, 4), w: 26, c: 1 }], ['frog', { cx: 70, by: on(g, 70, 6), w: 32 }], ['cat', { cx: 194, by: on(g, 194, 6), w: 26 }], ['mask', { cx: 30, cy: 160, w: 22 }]]); },
  },
  'round-the-year': {
    '3-5'(S) { const g = ground(S, 194); put(S, [['snowflake', { cx: 186, cy: 114, w: 24, c: 1 }], ['snowflake', { cx: 150, cy: 132, w: 14 }], ['snowman', { cx: 100, by: on(g, 100, 4), w: 50, c: 1 }], ['leaf', { cx: 34, cy: 140, w: 26, rot: -20 }], ['umbrella', { cx: 176, by: on(g, 176, 4), w: 40 }]]); },
    '5-7'(S) { const g = ground(S, 194); put(S, [['sun', { cx: 30, cy: 118, w: 24, c: 1 }], ['cloud', { cx: 96, cy: 112, w: 34 }], ['snowflake', { cx: 186, cy: 112, w: 18 }], ['umbrella', { cx: 150, cy: 130, w: 26 }], ['tulip', { cx: 26, by: on(g, 26, 4), w: 18 }], ['kite', { cx: 120, cy: 140, w: 14, rot: 15 }], ['snowman', { cx: 64, by: on(g, 64, 4), w: 30 }], ['pumpkin', { cx: 104, by: on(g, 104, 4), w: 24, c: 1 }], ['fir', { cx: 146, by: on(g, 146, 4), w: 26 }], ['leaf', { cx: 190, by: on(g, 190, 2), w: 18 }]]); },
  },
  'game-on': {
    '3-5'(S) { const g = ground(S, 194); put(S, [['pennant', { cx: 176, by: on(g, 176, 4), w: 34, c: 1 }], ['football', { cx: 106, by: on(g, 106, 2), w: 44 }], ['fox', { cx: 44, by: on(g, 44, 6), w: 44, c: 1 }], ['cone', { cx: 146, by: on(g, 146, 4), w: 22 }], ['sun', { cx: 196, cy: 114, w: 22 }]]); },
    '5-7'(S) { const g = ground(S, 194); put(S, [['bike', { cx: 54, by: on(g, 54, 4), w: 44, c: 1 }], ['skates', { cx: 104, by: on(g, 104, 4), w: 22 }], ['cone', { cx: 130, by: on(g, 130, 4), w: 16 }], ['football', { cx: 154, by: on(g, 154, 2), w: 20, c: 1 }], ['bear', { cx: 188, by: on(g, 188, 6), w: 30 }], ['pennant', { cx: 20, by: on(g, 20, 4), w: 22 }], ['ball', { cx: 156, cy: 128, w: 16 }], ['cloud', { cx: 90, cy: 118, w: 30 }]]); },
  },
  'everyday-heroes': {
    '3-5'(S) { const g = ground(S, 196); put(S, [['tree', { cx: 40, by: on(g, 40, 4), w: 44 }], ['firetruck', { cx: 120, by: on(g, 120, 4), w: 82, c: 1 }], ['cape', { cx: 188, cy: 128, w: 36 }], ['star', { cx: 90, cy: 116, w: 12, c: 1 }]]); },
    '5-7'(S) { const g = ground(S, 194); put(S, [['helicopter', { cx: 170, cy: 118, w: 40, c: 1 }], ['bolt', { cx: 30, cy: 124, w: 14 }], ['shield', { cx: 60, cy: 126, w: 22 }], ['house', { cx: 36, by: on(g, 36, 4), w: 40 }], ['firetruck', { cx: 104, by: on(g, 104, 4), w: 50 }], ['dog', { cx: 154, by: on(g, 154, 6), w: 24, c: 1 }], ['cat', { cx: 190, by: on(g, 190, 6), w: 24 }], ['mask', { cx: 112, cy: 128, w: 20 }]]); },
  },
  'on-the-move': {
    '3-5'(S) { const g = ground(S, 196); put(S, [['balloon', { cx: 186, cy: 122, w: 36, c: 1 }], ['cloud', { cx: 46, cy: 114, w: 40 }], ['plane', { cx: 110, cy: 124, w: 40 }], ['car', { cx: 92, by: on(g, 92, 6), w: 70, c: 1 }], ['trafficlight', { cx: 160, by: on(g, 160, 4), w: 12 }]]); },
    '5-7'(S) { const g = ground(S, 194); put(S, [['helicopter', { cx: 42, cy: 118, w: 32 }], ['balloon', { cx: 188, cy: 116, w: 24, c: 1 }], ['plane', { cx: 120, cy: 112, w: 30 }], ['train', { cx: 52, by: on(g, 52, 4), w: 40, c: 1 }], ['wagon', { cx: 90, by: on(g, 90, 4), w: 28 }], ['bus', { cx: 140, by: on(g, 140, 4), w: 38 }], ['bike', { cx: 190, by: on(g, 190, 4), w: 30 }], ['boat', { cx: 150, cy: 140, w: 22 }]]); },
  },
};
