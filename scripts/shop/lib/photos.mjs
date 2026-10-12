// Product photo scenes (1200 × 1200 px HTML/CSS/SVG), rendered by Playwright into AVIF and WebP. The real print
// art is placed on the product with code (perspective, cylinder mapping, multiply blend for paper and fabric), never
// redrawn. Style: Scandinavian and calm. Natural daylight from the top-left, light oak, linen, warm white walls,
// a plant, crayons, soft shadows, the Telning palette, no clutter. No people. These are honest renders until a real
// photoshoot exists (see REPORT.md, "Needs a human").
import { TOKENS_CSS } from './render.mjs';

const N = 1200;
const u = (png, type = 'png') => `data:image/${type};base64,${png.toString('base64')}`;
export const dataUri = u;

/* ---------- textures ---------- */
const svgUri = (s) => `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
const NOISE = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`);
const GRAIN = (seed = 2) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200'><filter id='w'><feTurbulence type='turbulence' baseFrequency='0.003 0.05' numOctaves='3' seed='${seed}' result='a'/><feTurbulence type='fractalNoise' baseFrequency='0.02 0.8' numOctaves='2' seed='${seed + 9}' result='b'/><feBlend in='a' in2='b' mode='multiply' result='c'/><feColorMatrix in='c' values='0 0 0 0 0.45  0 0 0 0 0.32  0 0 0 0 0.18  0 0 0 0.55 -0.1'/></filter><rect width='100%' height='100%' filter='url(#w)'/></svg>`);
const WEAVE = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><path d='M0 8L8 0M-2 2L2-2M6 10L10 6' stroke='black' stroke-opacity='.10' stroke-width='1.2'/></svg>`);
const LINEN = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'><path d='M0 3h6M3 0v6' stroke='black' stroke-opacity='.07' stroke-width='1'/></svg>`);
const FIBRE = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.03 .6' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .3 0'/></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>`);

const CSS = `${TOKENS_CSS}
html,body{margin:0}body{width:${N}px;height:${N}px;overflow:hidden;font-family:var(--font-text)}
.sc{position:relative;width:${N}px;height:${N}px;overflow:hidden}
.abs{position:absolute}
.noise{position:absolute;inset:0;background-image:${NOISE};opacity:.18;mix-blend-mode:multiply;pointer-events:none}
.paperbg{background:radial-gradient(120% 90% at 28% 12%,#f9f5ee 0%,#f6f1e8 55%,#ece4d6 100%)}
.oak{background:${GRAIN(3)},linear-gradient(100deg,#e9d8bb,#dcc6a2 45%,#e4cfae 75%,#d6bf9a);background-blend-mode:multiply}
.oak::after{content:"";position:absolute;inset:0;background:radial-gradient(90% 70% at 25% 15%,rgba(255,250,238,.5),transparent 60%),linear-gradient(180deg,transparent 65%,rgba(60,40,15,.1))}
.wall{background:linear-gradient(180deg,#f4f0e9,#ebe5da 75%,#e5ded1)}
.linen{background:${LINEN},${FIBRE},linear-gradient(135deg,#f2ece1,#e8e0d2);background-blend-mode:multiply}
.floor{background:${GRAIN(7)},linear-gradient(180deg,#dcc39d,#cdb186);background-blend-mode:multiply}
.light{position:absolute;inset:0;pointer-events:none;background:radial-gradient(80% 60% at 16% 6%,rgba(255,252,242,.55),transparent 62%)}
.window{position:absolute;inset:0;pointer-events:none;background:linear-gradient(112deg,rgba(255,250,235,.0) 20%,rgba(255,250,235,.28) 32%,rgba(255,250,235,.0) 48%,rgba(255,250,235,.16) 56%,rgba(255,250,235,0) 70%)}
.shadow{position:absolute;border-radius:50%;background:rgba(60,40,15,.32);filter:blur(24px)}
.paper{position:absolute;background-size:cover;box-shadow:0 1px 1px rgba(40,30,15,.16),0 6px 14px rgba(40,30,15,.14),0 22px 40px rgba(40,30,15,.10)}
.paper::after{content:"";position:absolute;inset:0;background-image:${NOISE};opacity:.1;mix-blend-mode:multiply}
.matte::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(115deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,0) 35%,rgba(0,0,0,0) 70%,rgba(0,0,0,.07) 100%);pointer-events:none}
img.fill{display:block;width:100%;height:100%}
`;
export const html = (body, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${extra}</style></head><body>${body}</body></html>`;

/* ---------- props ---------- */
const CRAYON = { red: ['#d7462e', '#a9321d', '#f08a72'], gold: ['#e9b43c', '#b8841a', '#f8d98c'], sea: ['#4f7fae', '#2f5c88', '#8fb3d8'], forest: ['#3d6e58', '#1e4a3b', '#79a58f'], rose: ['#e59a82', '#c0715a', '#f4c3b2'] };
/** A wax crayon seen from above. */
export function crayon(colour, { x, y, len = 300, rot = 0, w = 30 } = {}) {
  const [c, d, l] = CRAYON[colour] || CRAYON.red;
  const id = `g${colour}${Math.round(x)}${Math.round(y)}`;
  return `<svg class="abs" style="left:${x}px;top:${y}px;width:${len}px;height:${w * 1.6}px;transform:rotate(${rot}deg);transform-origin:50% 50%;filter:drop-shadow(0 6px 5px rgba(40,25,10,.3))" viewBox="0 0 ${len} ${w * 1.6}">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient>
<linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset=".4" stop-color="#f2e8d6"/><stop offset="1" stop-color="#c9bba3"/></linearGradient></defs>
<g transform="translate(0 ${w * 0.3})"><path d="M0 ${w / 2} L${w * 1.1} ${w * 0.18} H${w * 1.6} V${w * 0.82} H${w * 1.1} Z" fill="url(#${id})"/>
<rect x="${w * 1.55}" y="0" width="${len - w * 1.6}" height="${w}" rx="${w * 0.18}" fill="url(#${id})"/>
<rect x="${w * 2.6}" y="-0.5" width="${len - w * 4}" height="${w + 1}" fill="url(#${id}w)"/>
<rect x="${w * 2.6}" y="${w * 0.22}" width="${len - w * 4}" height="${w * 0.56}" fill="${c}" opacity=".9"/>
<rect x="${w * 3.2}" y="-0.5" width="${w * 0.25}" height="${w + 1}" fill="${d}" opacity=".7"/><rect x="${len - w * 2.2}" y="-0.5" width="${w * 0.25}" height="${w + 1}" fill="${d}" opacity=".7"/>
<rect x="${w * 2.6}" y="${w * 0.1}" width="${len - w * 4}" height="${w * 0.12}" fill="#fff" opacity=".35"/></g></svg>`;
}
const crayons = (list) => list.map(([c, o]) => crayon(c, o)).join('');
/** A small plant in a terracotta pot (paper-theatre style, soft shadow). */
export function plant({ x, y, s = 1 } = {}) {
  return `<svg class="abs" style="left:${x}px;top:${y}px;width:${220 * s}px;height:${300 * s}px;filter:drop-shadow(0 14px 14px rgba(40,25,10,.22))" viewBox="0 0 220 300">
<path d="M110 150c-40-30-80-20-90-60 40-8 80 10 90 60z" fill="#3d6e58"/><path d="M110 150c40-40 80-30 95-70-45-6-85 20-95 70z" fill="#86a672"/><path d="M110 150c-10-50 10-100 30-120 20 30 10 90-30 120z" fill="#1e4a3b"/><path d="M110 150c-30-20-70-50-60-100 40 20 60 60 60 100z" fill="#5f8f74"/>
<path d="M110 150v60" stroke="#3d6e58" stroke-width="6" stroke-linecap="round"/>
<path d="M60 196h100l-10 90H70z" fill="#c9825a"/><path d="M54 186h112v16H54z" fill="#d9946a"/><path d="M150 196l-10 90h20l6-90z" fill="#b06e48"/></svg>`;
}
/** Soft contact shadow under an object. */
const drop = (x, y, w, h, op = 0.32) => `<div class="shadow" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;opacity:${op}"></div>`;

/* ---------- clean product shots on #f6f1e8 ---------- */
export function clean(img, { w, h = w, radius = 0, rot = 0, shadow = true } = {}) {
  const x = (N - w) / 2, y = (N - h) / 2;
  return html(`<div class="sc paperbg"><div class="noise"></div>
${shadow ? drop(x + 20, y + h - 30, w - 40, 60, 0.4) : ''}
<div class="paper matte" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${radius}px;background-image:url(${img});transform:rotate(${rot}deg)"></div>
<div class="light"></div></div>`);
}

/* ---------- books ---------- */
const face = (img, extra = '') => `<div class="paper matte" style="inset:0;background-image:url(${img});${extra}"></div>`;

/** Hero: the book on a light oak table, a linen cloth, three crayons, a plant in the corner, window light. */
export function bookTable(front) {
  return html(`<div class="sc oak"><div class="window"></div>
<div class="abs linen" style="left:-80px;top:-60px;width:620px;height:1400px;transform:rotate(-7deg);box-shadow:8px 0 18px rgba(40,25,10,.12)"></div>
${plant({ x: 940, y: -40, s: 1.15 })}
<div class="abs" style="left:230px;top:200px;width:800px;height:800px;perspective:2400px">
 <div class="abs" style="inset:0;transform:rotateX(26deg) rotateZ(-7deg);transform-style:preserve-3d">
  <div class="abs" style="left:14px;top:30px;width:740px;height:740px;background:rgba(40,25,10,.5);filter:blur(26px);transform:translate(26px,36px)"></div>
  <div class="abs" style="left:0;top:0;width:740px;height:740px;background:repeating-linear-gradient(0deg,#fbf8f2 0 2px,#e6dfd2 2px 3px);transform:translate(5px,7px)"></div>
  <div class="abs" style="left:0;top:0;width:740px;height:740px">${face(front)}</div>
 </div></div>
${crayons([['red', { x: 760, y: 960, len: 300, rot: -22, w: 30 }], ['sea', { x: 90, y: 1010, len: 290, rot: 6, w: 30 }], ['gold', { x: 900, y: 700, len: 280, rot: 72, w: 30 }]])}
<div class="light"></div></div>`);
}

/** An open book on oak: left page and right page, a soft curve into the spine. */
export function bookOpen(left, right, { crayonOn = true } = {}) {
  const pg = (img, side) => `<div class="abs" style="left:${side === 'l' ? 0 : 500}px;top:0;width:500px;height:500px;background:url(${img}) center/cover;box-shadow:${side === 'l' ? 'inset -26px 0 30px -18px rgba(40,25,10,.35)' : 'inset 26px 0 30px -18px rgba(40,25,10,.3)'}"></div>`;
  return html(`<div class="sc oak"><div class="window"></div>
<div class="abs" style="left:60px;top:260px;width:1080px;height:700px;perspective:2600px">
 <div class="abs" style="left:40px;top:40px;width:1000px;height:520px;transform:rotateX(34deg) rotateZ(-4deg);transform-style:preserve-3d">
  <div class="abs" style="inset:-6px;background:#1e4a3b;transform:translate(10px,14px)"></div>
  <div class="abs" style="inset:0;background:#fff;box-shadow:0 30px 60px rgba(40,25,10,.35)">${pg(left, 'l')}${pg(right, 'r')}
   <div class="abs" style="left:496px;top:0;width:8px;height:100%;background:linear-gradient(90deg,rgba(0,0,0,.18),rgba(0,0,0,.05) 50%,rgba(0,0,0,.18))"></div></div>
 </div></div>
${crayonOn ? crayons([['red', { x: 820, y: 990, len: 280, rot: -16, w: 28 }], ['forest', { x: 140, y: 1040, len: 260, rot: 10, w: 28 }]]) : ''}
<div class="light"></div></div>`);
}

/* ---------- Story Walls ---------- */
/** Framed, finished, on a warm white wall in a child's room: oak frame, a low oak bench, a plant. */
export function wallRoom(finished, { W = 760, H = 532 } = {}) {
  const x = (N - W) / 2 - 60, y = 150, f = 22;
  return html(`<div class="sc wall"><div class="noise" style="opacity:.12"></div>
<div class="abs floor" style="left:0;right:0;bottom:0;height:150px"></div>
<div class="abs" style="left:0;right:0;bottom:150px;height:14px;background:#f8f5ef;box-shadow:0 2px 4px rgba(0,0,0,.1)"></div>
<div class="abs" style="left:120px;right:120px;bottom:164px;height:26px;border-radius:4px;background:linear-gradient(180deg,#e2cba4,#cbb089);box-shadow:0 14px 24px rgba(40,25,10,.25)"></div>
<div class="abs" style="left:170px;bottom:0;width:28px;height:166px;background:linear-gradient(90deg,#cbb089,#b99a72)"></div><div class="abs" style="right:170px;bottom:0;width:28px;height:166px;background:linear-gradient(90deg,#cbb089,#b99a72)"></div>
${plant({ x: 920, y: 740, s: 1.2 })}
<div class="abs" style="left:230px;bottom:190px;width:120px;height:160px;border-radius:12px;background:linear-gradient(180deg,#e8dcc6,#d2c2a6);box-shadow:0 18px 26px rgba(40,25,10,.25)"></div>
${crayons([['red', { x: 232, y: 760, len: 170, rot: -82, w: 22 }], ['gold', { x: 262, y: 752, len: 180, rot: -88, w: 22 }], ['sea', { x: 292, y: 760, len: 170, rot: -94, w: 22 }], ['forest', { x: 212, y: 768, len: 160, rot: -74, w: 22 }]])}
<div class="abs" style="left:230px;bottom:190px;width:120px;height:160px;border-radius:12px;background:linear-gradient(180deg,#e8dcc6,#d2c2a6)"></div>
${drop(x + 20, y + H + 2 * f - 10, W, 60, 0.35)}
<div class="abs" style="left:${x}px;top:${y}px;width:${W + 2 * f}px;height:${H + 2 * f}px;background:linear-gradient(135deg,#dfc49c,#cfae7f 40%,#c3a071);box-shadow:0 2px 3px rgba(0,0,0,.18),10px 22px 40px rgba(40,30,20,.28)">
 <div class="abs" style="inset:${f}px;background:url(${finished}) center/cover;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1),inset 2px 3px 6px rgba(0,0,0,.16)"></div>
 <div class="abs" style="inset:${f}px;background:linear-gradient(120deg,rgba(255,255,255,.2),rgba(255,255,255,0) 38%,rgba(255,255,255,.06) 60%,rgba(255,255,255,0))"></div></div>
<div class="light" style="background:radial-gradient(70% 55% at 22% 8%,rgba(255,250,235,.5),transparent 65%)"></div></div>`);
}
/** In progress: the sheet flat on the table, crayons around, half coloured. Bird's-eye. */
export function wallProgress(progress) {
  return html(`<div class="sc oak"><div class="window"></div>
<div class="abs" style="left:-130px;top:120px;width:1460px;height:1022px;transform:rotate(-3deg)">${face(progress)}</div>
<div class="abs" style="left:900px;top:980px;width:300px;height:300px;border-radius:14px;background:linear-gradient(180deg,#e8dcc6,#d2c2a6);box-shadow:0 18px 26px rgba(40,25,10,.3)"></div>
${crayons([['red', { x: 560, y: 1040, len: 380, rot: -28, w: 36 }], ['sea', { x: 100, y: 990, len: 360, rot: 14, w: 36 }], ['gold', { x: 740, y: 180, len: 340, rot: 62, w: 36 }], ['forest', { x: 20, y: 60, len: 320, rot: -40, w: 34 }], ['rose', { x: 880, y: 1100, len: 300, rot: -84, w: 32 }]])}
<div class="light"></div></div>`);
}
/** Close-up of the edge between printed colour and open line art, paper grain visible. */
export function wallDetail(crop) {
  return html(`<div class="sc paperbg">
<div class="abs" style="left:-40px;top:-40px;width:1280px;height:1280px;transform:rotate(-2deg)"><div class="paper" style="inset:0;background-image:url(${crop})"></div><div class="abs" style="inset:0;background-image:${NOISE};opacity:.22;mix-blend-mode:multiply"></div></div>
${crayons([['red', { x: 700, y: 900, len: 440, rot: -30, w: 44 }], ['sea', { x: 60, y: 1010, len: 400, rot: 8, w: 44 }]])}
<div class="light"></div></div>`);
}
/** Scale: the Story Wall on the wall next to a child's chair and a plant (100 cm wide). */
export function wallScale(finished) {
  const W = 640, H = 448, f = 18, x = 90, y = 200;
  return html(`<div class="sc wall"><div class="noise" style="opacity:.12"></div>
<div class="abs floor" style="left:0;right:0;bottom:0;height:200px"></div>
<div class="abs" style="left:0;right:0;bottom:200px;height:14px;background:#f8f5ef;box-shadow:0 2px 4px rgba(0,0,0,.1)"></div>
${drop(x + 20, y + H + 2 * f - 10, W, 60, 0.3)}
<div class="abs" style="left:${x}px;top:${y}px;width:${W + 2 * f}px;height:${H + 2 * f}px;background:linear-gradient(135deg,#dfc49c,#cfae7f 40%,#c3a071);box-shadow:0 2px 3px rgba(0,0,0,.18),10px 22px 40px rgba(40,30,20,.28)">
 <div class="abs" style="inset:${f}px;background:url(${finished}) center/cover;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)"></div></div>
<svg class="abs" style="left:800px;top:620px;width:300px;height:400px;filter:drop-shadow(0 18px 18px rgba(40,25,10,.25))" viewBox="0 0 300 400"><rect x="60" y="20" width="180" height="150" rx="16" fill="#e4cfae"/><rect x="60" y="20" width="180" height="150" rx="16" fill="none" stroke="#c9ad83" stroke-width="4"/><rect x="40" y="170" width="220" height="30" rx="8" fill="#d8bf98"/><rect x="52" y="200" width="22" height="190" rx="6" fill="#cbb089"/><rect x="226" y="200" width="22" height="190" rx="6" fill="#cbb089"/><rect x="100" y="200" width="18" height="150" rx="6" fill="#c3a67e"/><rect x="182" y="200" width="18" height="150" rx="6" fill="#c3a67e"/></svg>
${plant({ x: 1010, y: 720, s: 0.9 })}
<div class="abs" style="left:${x}px;top:${y + H + 2 * f + 30}px;width:${W + 2 * f}px;height:2px;background:#4a453d;opacity:.5"></div>
<div class="abs" style="left:${x}px;top:${y + H + 2 * f + 22}px;width:2px;height:18px;background:#4a453d;opacity:.5"></div><div class="abs" style="left:${x + W + 2 * f - 2}px;top:${y + H + 2 * f + 22}px;width:2px;height:18px;background:#4a453d;opacity:.5"></div>
<div class="abs" style="left:${x}px;top:${y + H + 2 * f + 42}px;width:${W + 2 * f}px;text-align:center;font:600 20px var(--font-text);letter-spacing:.14em;color:#4a453d">100 CM</div>
<div class="light"></div></div>`);
}

/* ---------- mugs ---------- */
/** A mug in SVG with the wrap mapped round the cylinder. side: centre of the visible half in wrap mm. */
export function mugSvg(wrap, { side = 57.15, handle = 'right', inside = '#FFFFFF', W = 640, cx = 600, top = 300, tilt = 0.14 } = {}) {
  const Wmm = 228.6, Hmm = 88.9, circ = Math.PI * 83, mugH = 96;
  const R = W / 2, H = (W / 83) * mugH, ry = R * tilt;
  const x0 = cx - R;
  const strips = [];
  const n = 80;
  for (let i = 0; i < n; i++) {
    const t0 = -Math.PI / 2 + (Math.PI * i) / n, t1 = -Math.PI / 2 + (Math.PI * (i + 1)) / n;
    const sx0 = cx + R * Math.sin(t0), sx1 = cx + R * Math.sin(t1);
    const u0 = side + (t0 / (2 * Math.PI)) * circ, u1 = side + (t1 / (2 * Math.PI)) * circ;
    if (u1 < 0 || u0 > Wmm) continue;
    const yoff = top + ((mugH - Hmm) / 2 / mugH) * H;
    const ph = (Hmm / mugH) * H;
    const mid = (t0 + t1) / 2;
    const sag = ry * Math.cos(mid);
    strips.push(`<svg x="${sx0.toFixed(2)}" y="${(yoff + sag).toFixed(2)}" width="${(sx1 - sx0 + 0.6).toFixed(2)}" height="${ph.toFixed(2)}" viewBox="${u0.toFixed(3)} 0 ${(u1 - u0).toFixed(3)} ${Hmm}" preserveAspectRatio="none"><image href="${wrap}" width="${Wmm}" height="${Hmm}"/></svg>`);
  }
  const hx = handle === 'right' ? cx + R - 12 : cx - R + 12, dir = handle === 'right' ? 1 : -1;
  const hy = top + H * 0.18, hh = H * 0.6;
  const handleD = `M${hx} ${hy} c${dir * R * 0.62} ${-hh * 0.08} ${dir * R * 0.66} ${hh * 1.02} 0 ${hh}`;
  const handleCol = inside === '#FFFFFF' ? '#f4f2ee' : inside;
  return `<svg class="abs" style="left:0;top:0" width="1200" height="1200" viewBox="0 0 1200 1200">
<defs>
<linearGradient id="body" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".12" stop-color="#000" stop-opacity=".08"/><stop offset=".3" stop-color="#fff" stop-opacity=".0"/><stop offset=".36" stop-color="#fff" stop-opacity=".5"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient>
<linearGradient id="inner" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient>
<linearGradient id="hand" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
<clipPath id="mugclip"><path d="M${x0} ${top}h${W}v${H}a${R} ${ry} 0 0 1 ${-W} 0z"/></clipPath>
</defs>
<ellipse cx="${cx + 10}" cy="${top + H + 8}" rx="${R * 1.1}" ry="${ry * 1.6}" fill="#3a2a15" opacity=".3" style="filter:blur(16px)"/>
<path d="${handleD}" fill="none" stroke="${handleCol}" stroke-width="${R * 0.17}" stroke-linecap="round"/>
<path d="${handleD}" fill="none" stroke="url(#hand)" stroke-width="${R * 0.17}" stroke-linecap="round" opacity=".8"/>
<path d="M${x0} ${top}h${W}v${H}a${R} ${ry} 0 0 1 ${-W} 0z" fill="#fbfaf8"/>
<g clip-path="url(#mugclip)">${strips.join('')}</g>
<path d="M${x0} ${top}h${W}v${H}a${R} ${ry} 0 0 1 ${-W} 0z" fill="url(#body)"/>
<ellipse cx="${cx}" cy="${top}" rx="${R}" ry="${ry}" fill="#f6f4f0"/>
<ellipse cx="${cx}" cy="${top + 2}" rx="${R - 9}" ry="${ry - 3}" fill="${inside}"/>
<ellipse cx="${cx}" cy="${top + 2}" rx="${R - 9}" ry="${ry - 3}" fill="url(#inner)"/>
</svg>`;
}
const steam = (x, y) => `<svg class="abs" style="left:${x}px;top:${y}px;width:120px;height:160px;opacity:.5" viewBox="0 0 120 160"><path d="M30 150c-20-30 20-50 0-80s20-50 0-70M70 150c-20-30 20-50 0-80s20-50 0-70" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" style="filter:blur(6px)"/></svg>`;

export function mugClean(wrap, o = {}) {
  return html(`<div class="sc paperbg"><div class="noise"></div>${mugSvg(wrap, { W: 600, cx: 580, top: 330, ...o })}<div class="light"></div></div>`);
}
/** Hero: breakfast table, morning light: the mug, an open book, a spoon, steam. */
export function mugBreakfast(wrap, pages, o = {}) {
  return html(`<div class="sc oak"><div class="window"></div>
<div class="abs linen" style="left:560px;top:-80px;width:900px;height:1400px;transform:rotate(6deg);box-shadow:-8px 0 18px rgba(40,25,10,.1)"></div>
<div class="abs" style="left:560px;top:470px;width:760px;height:560px;perspective:1800px"><div class="abs" style="inset:0;transform:rotateX(44deg) rotateZ(-10deg) scale(.9);transform-style:preserve-3d">
 <div class="abs" style="left:30px;top:40px;width:700px;height:360px;background:rgba(40,25,10,.45);filter:blur(22px)"></div>
 <div class="abs" style="left:0;top:0;width:720px;height:360px;background:#fff;box-shadow:0 10px 30px rgba(40,25,10,.2)"><div class="abs" style="left:0;top:0;width:360px;height:360px;background:url(${pages[0]}) center/cover;box-shadow:inset -20px 0 24px -14px rgba(0,0,0,.3)"></div><div class="abs" style="left:360px;top:0;width:360px;height:360px;background:url(${pages[1]}) center/cover;box-shadow:inset 20px 0 24px -14px rgba(0,0,0,.25)"></div></div></div></div>
${mugSvg(wrap, { W: 400, cx: 380, top: 500, tilt: 0.22, ...o })}
${steam(260, 340)}
<svg class="abs" style="left:120px;top:1000px;width:420px;height:60px;transform:rotate(-8deg);filter:drop-shadow(0 8px 8px rgba(40,25,10,.3))" viewBox="0 0 420 60"><path d="M0 30c0-12 10-22 24-22h300c40 0 70 0 88 14 10 8 10 8 0 16-18 14-48 14-88 14H24C10 52 0 42 0 30z" fill="url(#sp)"/><defs><linearGradient id="sp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e6df"/><stop offset=".5" stop-color="#c9c4b9"/><stop offset="1" stop-color="#9f9a8f"/></linearGradient></defs></svg>
<div class="light"></div></div>`);
}
/** Close-up of the print on the glazed ceramic. */
export function mugDetail(wrap, o = {}) {
  return html(`<div class="sc paperbg"><div class="noise"></div>
<div class="abs" style="left:-300px;top:-240px;width:1800px;height:1800px;transform:scale(1)">${mugSvg(wrap, { W: 1500, cx: 900, top: 420, tilt: 0.13, ...o })}</div>
<div class="abs" style="inset:0;background:radial-gradient(60% 60% at 40% 40%,rgba(255,255,255,0),rgba(0,0,0,.12))"></div>
<div class="light"></div></div>`);
}
/** Scale: the mug next to the book standing up (21.6 cm). */
export function mugScale(wrap, front, o = {}) {
  return html(`<div class="sc paperbg"><div class="noise"></div>
<div class="abs" style="left:0;right:0;bottom:0;height:300px;background:linear-gradient(180deg,#e9e1d3,#dfd5c3)"></div>
${drop(560, 880, 480, 36, 0.5)}
<div class="abs" style="left:560px;top:330px;width:520px;height:560px;perspective:1800px"><div class="abs" style="left:40px;top:0;width:520px;height:520px;transform:rotateY(-22deg);transform-origin:0 50%;box-shadow:16px 24px 40px rgba(40,25,10,.22)">${face(front)}</div></div>
${mugSvg(wrap, { W: 330, cx: 330, top: 560, tilt: 0.14, ...o })}
<div class="light"></div></div>`);
}

/* ---------- tote bags ---------- */
export function toteSvg(print, { colour = 'natural', x = 270, y = 290, w = 660 } = {}) {
  const fabric = colour === 'black' ? '#211f1c' : '#eee5d2';
  const strap = colour === 'black' ? '#1a1916' : '#e3d7bf';
  const h = w * (36 / 41);
  const strapSvg = (sx) => `<svg class="abs" style="left:${sx}px;top:${-h * 0.5}px;width:${w * 0.26}px;height:${h * 0.62}px" viewBox="0 0 100 150"><path d="M14 150V60c0-50 72-50 72 0v90" fill="none" stroke="${strap}" stroke-width="16" stroke-linecap="butt"/><path d="M14 150V60c0-50 72-50 72 0v90" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="16" stroke-dasharray="1 0" style="mask:linear-gradient(90deg,#000,transparent)"/><path d="M8 150V60M92 150V60" stroke="rgba(0,0,0,.1)" stroke-width="1.2"/></svg>`;
  return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
${strapSvg(w * 0.14)}${strapSvg(w * 0.6)}
<div class="abs" style="inset:0;border-radius:6px 6px 14px 14px;background:${fabric};box-shadow:0 30px 60px rgba(40,25,10,.26),0 6px 12px rgba(40,25,10,.16)"></div>
<div class="abs" style="left:${w * 0.12}px;top:${h * 0.1}px;width:${w * 0.76}px;height:${w * 0.76}px;background:url(${print}) center/contain no-repeat;${colour === 'black' ? 'opacity:.95' : 'mix-blend-mode:multiply;opacity:.96'}"></div>
<div class="abs" style="inset:0;border-radius:6px 6px 14px 14px;background-image:${WEAVE},${FIBRE};mix-blend-mode:${colour === 'black' ? 'screen' : 'multiply'};opacity:${colour === 'black' ? '.16' : '.65'}"></div>
<div class="abs" style="inset:0;border-radius:6px 6px 14px 14px;background:linear-gradient(90deg,rgba(0,0,0,.12),rgba(0,0,0,0) 12%,rgba(255,255,255,.08) 40%,rgba(0,0,0,0) 70%,rgba(0,0,0,.14)),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,0) 10%,rgba(0,0,0,0) 85%,rgba(0,0,0,.12))"></div>
<div class="abs" style="left:0;right:0;top:0;height:${w * 0.05}px;border-bottom:2px dashed rgba(0,0,0,.14)"></div>
</div>`;
}
export function toteClean(print, colour) {
  return html(`<div class="sc paperbg"><div class="noise"></div>${toteSvg(print, { colour, x: 250, y: 380, w: 700 })}<div class="light"></div></div>`);
}
/** Hero: on an oak hook on a warm white wall, the book peeking out. */
export function toteHook(print, front, colour = 'natural') {
  return html(`<div class="sc wall"><div class="noise" style="opacity:.12"></div>
<div class="abs" style="left:0;right:0;top:140px;height:34px;background:linear-gradient(180deg,#e4cfae,#c9ad83);box-shadow:0 8px 14px rgba(40,25,10,.2)"></div>
<div class="abs" style="left:560px;top:160px;width:54px;height:54px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#e8d3b0,#b2905f)"></div>
<div class="abs" style="left:380px;top:260px;width:420px;height:420px;transform:rotate(-5deg);box-shadow:0 10px 20px rgba(0,0,0,.18)">${face(front)}</div>
${toteSvg(print, { colour, x: 290, y: 430, w: 620 })}
${plant({ x: 940, y: 820, s: 1 })}
<div class="abs floor" style="left:0;right:0;bottom:0;height:90px"></div>
<div class="light"></div></div>`);
}
export function toteDetail(print, colour = 'natural') {
  const fabric = colour === 'black' ? '#211f1c' : '#eee5d2';
  return html(`<div class="sc" style="background:${fabric}">
<div class="abs" style="left:-120px;top:-60px;width:1440px;height:1440px;background:url(${print}) center/contain no-repeat;${colour === 'black' ? 'opacity:.95' : 'mix-blend-mode:multiply;opacity:.95'}"></div>
<div class="abs" style="inset:0;background-image:${WEAVE},${FIBRE};background-size:14px 14px,auto;mix-blend-mode:${colour === 'black' ? 'screen' : 'multiply'};opacity:${colour === 'black' ? '.2' : '.8'}"></div>
<div class="abs" style="inset:0;background:radial-gradient(90% 80% at 40% 30%,rgba(255,255,255,.12),rgba(0,0,0,.18))"></div></div>`);
}
/** In use: on a park bench, a leaf beside it. */
export function toteBench(print, colour = 'natural') {
  const slats = [0, 1, 2].map((i) => `<div class="abs oak" style="left:-20px;right:-20px;top:${600 + i * 96}px;height:78px;border-radius:8px;box-shadow:0 14px 16px rgba(40,25,10,.28)"></div>`).join('');
  return html(`<div class="sc" style="background:linear-gradient(180deg,#e3e9dc,#cfd9c6 55%,#c2cfb6)"><div class="noise" style="opacity:.14"></div>
<div class="abs" style="left:0;right:0;top:0;height:560px;background:radial-gradient(60% 50% at 70% 30%,rgba(255,255,255,.25),transparent 70%)"></div>
${slats}
${drop(330, 820, 560, 60, 0.45)}
${toteSvg(print, { colour, x: 300, y: 330, w: 600 })}
<svg class="abs" style="left:950px;top:760px;width:140px;height:140px;transform:rotate(30deg);filter:drop-shadow(0 6px 6px rgba(40,25,10,.3))" viewBox="0 0 120 120"><path d="M60 8c30 20 46 52 40 90-38 6-70-10-90-40C20 36 38 16 60 8z" fill="#86a672"/><path d="M60 8c-6 36-2 70 40 90" stroke="#3d6e58" stroke-width="3" fill="none"/></svg>
<div class="light"></div></div>`);
}

/* ---------- postcards and greeting cards ---------- */
export function flatCard(img, { w, h, radius = 0, rot = 0 } = {}) { return clean(img, { w, h, radius, rot }); }
/** Hero: a written postcard on the desk, the front beside it, a pen. */
export function postcardDesk(front, backWritten) {
  return html(`<div class="sc oak"><div class="window"></div>
<div class="abs linen" style="left:-120px;top:-120px;width:760px;height:1500px;transform:rotate(-9deg);box-shadow:8px 0 18px rgba(40,25,10,.1)"></div>
<div class="paper" style="left:120px;top:160px;width:640px;height:456px;border-radius:18px;background-image:url(${front});transform:rotate(-9deg)"></div>
<div class="paper" style="left:430px;top:500px;width:660px;height:472px;border-radius:18px;background-image:url(${backWritten});transform:rotate(5deg)"></div>
<svg class="abs" style="left:620px;top:860px;width:560px;height:60px;transform:rotate(-24deg);filter:drop-shadow(0 10px 10px rgba(40,25,10,.35))" viewBox="0 0 560 60"><rect x="40" y="18" width="480" height="24" rx="12" fill="url(#pen)"/><path d="M0 30l40-10v20z" fill="#2f5c88"/><rect x="60" y="18" width="30" height="24" fill="#2f5c88"/><circle cx="520" cy="30" r="12" fill="#2f5c88"/><defs><linearGradient id="pen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb3d8"/><stop offset=".5" stop-color="#4f7fae"/><stop offset="1" stop-color="#2f5c88"/></linearGradient></defs></svg>
${plant({ x: 960, y: -30, s: 0.95 })}
<div class="light"></div></div>`);
}
export function postcardPack(front) {
  const w = 760, h = 540;
  let cards = '';
  for (let i = 5; i >= 0; i--) cards += `<div class="paper" style="left:${200 + i * 16}px;top:${260 + i * 22}px;width:${w}px;height:${h}px;border-radius:22px;background-image:url(${front});transform:rotate(${-6 + i * 2.2}deg)"></div>`;
  return html(`<div class="sc paperbg"><div class="noise"></div>${cards}
<div class="abs" style="left:590px;top:240px;width:110px;height:640px;transform:rotate(-6deg);background:linear-gradient(90deg,#f1e9db,#e6dccb);box-shadow:0 4px 10px rgba(0,0,0,.18)"><div style="margin-top:230px;color:#16140f;font:600 16px var(--font-text);letter-spacing:.2em;writing-mode:vertical-rl;transform:rotate(180deg);margin-left:42px">TELNING · 10 POSTCARDS</div></div>
<div class="light"></div></div>`);
}
/** Close-up of the matte card with grain. */
export function paperDetail(img) {
  return html(`<div class="sc paperbg">
<div class="abs" style="left:-80px;top:-40px;width:1360px;height:1360px;transform:rotate(-3deg)"><div class="paper" style="inset:0;background-image:url(${img});background-size:cover"></div><div class="abs" style="inset:0;background-image:${NOISE};opacity:.26;mix-blend-mode:multiply"></div></div>
<div class="abs" style="inset:0;background:radial-gradient(70% 70% at 30% 30%,rgba(255,255,255,0),rgba(0,0,0,.1))"></div>
<div class="light"></div></div>`);
}
export function cardFold(front) {
  const s = 700;
  return html(`<div class="sc paperbg"><div class="noise"></div>
${drop(300, 950, 640, 50, 0.5)}
<div class="paper" style="left:${(N - s) / 2 + 14}px;top:${(N - s) / 2 + 10}px;width:${s}px;height:${s}px;background:#f3eee5"></div>
<div class="paper" style="left:${(N - s) / 2}px;top:${(N - s) / 2}px;width:${s}px;height:${s}px;background-image:url(${front})"></div>
<div class="abs" style="left:${(N - s) / 2}px;top:${(N - s) / 2}px;width:8px;height:${s}px;background:linear-gradient(90deg,rgba(0,0,0,.16),rgba(0,0,0,0))"></div>
<div class="light"></div></div>`);
}
export function cardOpen() {
  const s = 520;
  return html(`<div class="sc paperbg"><div class="noise"></div>
${drop(120, 880, 960, 60, 0.4)}
<div class="abs" style="left:80px;top:330px;width:1040px;height:540px;perspective:2400px">
 <div class="abs" style="left:520px;top:0;width:${s}px;height:${s}px;background:#fffdf8;transform:rotateY(14deg);transform-origin:0 50%;box-shadow:0 20px 40px rgba(40,25,10,.16)"><div class="noise" style="opacity:.1"></div><div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(0,0,0,.08),rgba(0,0,0,0) 25%)"></div></div>
 <div class="abs" style="left:0;top:0;width:${s}px;height:${s}px;background:#fffdf8;transform:rotateY(-14deg);transform-origin:100% 50%;box-shadow:0 20px 40px rgba(40,25,10,.16)"><div class="noise" style="opacity:.1"></div><div class="abs" style="inset:0;background:linear-gradient(270deg,rgba(0,0,0,.1),rgba(0,0,0,0) 25%)"></div></div>
</div>
<div class="abs" style="left:0;right:0;top:220px;text-align:center;font:400 30px var(--font-display);color:#4a453d">Blank inside, for your own words.</div>
<div class="light"></div></div>`);
}
/** Hero: a flat lay on linen with the envelope. */
export function cardFlatlay(front, { env = '#f5efe4' } = {}) {
  return html(`<div class="sc linen"><div class="noise" style="opacity:.1"></div>
<div class="paper" style="left:150px;top:300px;width:760px;height:560px;background:${env};transform:rotate(-7deg)">
 <div class="abs" style="left:0;top:0;width:760px;height:560px;background:linear-gradient(160deg,rgba(0,0,0,.06),transparent 50%),linear-gradient(20deg,rgba(0,0,0,.05),transparent 50%)"></div>
 <svg class="abs" style="left:0;top:0" width="760" height="560"><path d="M0 0L380 300L760 0" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2"/></svg></div>
<div class="paper" style="left:520px;top:400px;width:560px;height:560px;background-image:url(${front});transform:rotate(6deg)"></div>
${crayon('red', { x: 80, y: 1000, len: 280, rot: -10, w: 28 })}
<div class="light"></div></div>`);
}
/** Scale: the pack of ten cards and ten envelopes. */
export function cardPack(front, { env = '#f5efe4' } = {}) {
  let st = '';
  for (let i = 8; i >= 0; i--) st += `<div class="paper" style="left:${140 + i * 6}px;top:${300 + i * 7}px;width:520px;height:520px;background:${env};transform:rotate(${-4 + i * 0.6}deg)"></div>`;
  for (let i = 8; i >= 0; i--) st += `<div class="paper" style="left:${560 + i * 6}px;top:${360 + i * 7}px;width:520px;height:520px;background-image:url(${front});transform:rotate(${5 - i * 0.6}deg)"></div>`;
  return html(`<div class="sc paperbg"><div class="noise"></div>${st}
<div class="abs" style="left:560px;top:660px;width:520px;height:80px;background:linear-gradient(90deg,#f1e9db,#e6dccb);box-shadow:0 4px 10px rgba(0,0,0,.14);display:grid;place-items:center;font:600 16px var(--font-text);letter-spacing:.2em;color:#16140f;transform:rotate(1deg)">10 CARDS · 10 ENVELOPES</div>
<div class="light"></div></div>`);
}

/* ---------- Open Graph image for a product: 1200 × 630 ---------- */
export function og(photo, { kicker, title, price }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${TOKENS_CSS}
body{margin:0;width:1200px;height:630px;background:var(--paper);font-family:var(--font-text);color:var(--ink);display:grid;grid-template-columns:1fr 630px;overflow:hidden}
.l{padding:60px 40px 56px 64px;display:grid;align-content:space-between}
.k{font-weight:600;font-size:18px;letter-spacing:.14em;text-transform:uppercase;color:var(--red-deep);margin:0 0 16px}
h1{font-family:var(--font-display);font-weight:600;font-size:${title.length > 34 ? 48 : 58}px;line-height:1.04;margin:0;letter-spacing:-.015em}
.p{font-size:26px;font-weight:600;margin:18px 0 0}
.r{background:url(${photo}) center/cover}
.t{font:600 26px var(--font-display)}
</style></head><body><div class="l"><div><p class="k">${kicker}</p><h1>${title}</h1><p class="p">${price}</p></div><div class="t">Telning Publishing House</div></div><div class="r"></div></body></html>`;
}

/* ---------- packs for organisations: books, a Story Wall tube and a tote bag on a table ---------- */
export function packPhoto(covers, tote, n = 3) {
  const books = covers.slice(0, n).map((c, i) => `<div class="abs" style="left:${90 + i * 120}px;top:${170 + i * 70}px;width:470px;height:470px;transform:rotate(${-12 + i * 9}deg);box-shadow:0 18px 30px rgba(40,25,10,.3)">${face(c)}</div>`).join('');
  return html(`<div class="sc oak"><div class="window"></div>
${books}
<div class="abs" style="left:520px;top:120px;width:620px;height:120px;transform:rotate(18deg);filter:drop-shadow(0 22px 18px rgba(40,25,10,.3))">
 <div class="abs" style="inset:0;border-radius:60px;background:linear-gradient(180deg,#e3c9a0,#cfae7f 35%,#b08a5a 75%,#97744a)"></div>
 <div class="abs" style="left:200px;top:0;width:200px;height:120px;background:linear-gradient(180deg,#fffdf8,#ede6da 40%,#cfc4b2)"></div>
 <div class="abs" style="left:215px;top:34px;width:170px;font:600 19px/1.2 var(--font-display);color:#16140f;text-align:center">Telning<br><span style="font:600 10px var(--font-text);letter-spacing:.18em">STORY WALL</span></div>
 <div class="abs" style="left:575px;top:0;width:60px;height:120px;border-radius:50%;background:radial-gradient(circle at 40% 45%,#3d3a34,#16140f 70%)"></div></div>
${toteSvg(tote, { colour: 'natural', x: 640, y: 640, w: 440 })}
<div class="light"></div></div>`);
}
