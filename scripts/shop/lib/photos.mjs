// Product photo scenes (1200 × 1200 px HTML/CSS/SVG), rendered by Playwright into WebP: the art placed on a book,
// a frame on a wall, a mug, a cotton bag, cards and envelopes, with paper and wood textures, soft light and real
// shadows. Art comes in as PNG data URIs (rendered first with the site fonts). These are honest mockups for the
// shop until real product photos exist.
import { TOKENS_CSS } from './render.mjs';

const N = 1200;
const u = (png, type = 'png') => `data:image/${type};base64,${png.toString('base64')}`;
export const dataUri = u;

/* ---------- textures ---------- */
const svgUri = (s) => `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
const NOISE = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`);
const GRAIN = (seed = 2) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200'><filter id='w'><feTurbulence type='turbulence' baseFrequency='0.004 0.06' numOctaves='3' seed='${seed}' result='a'/><feTurbulence type='fractalNoise' baseFrequency='0.02 0.9' numOctaves='2' seed='${seed + 9}' result='b'/><feBlend in='a' in2='b' mode='multiply' result='c'/><feColorMatrix in='c' values='0 0 0 0 0.36  0 0 0 0 0.22  0 0 0 0 0.1  0 0 0 0.9 -0.12'/></filter><rect width='100%' height='100%' filter='url(#w)'/></svg>`);
const WEAVE = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><path d='M0 8L8 0M-2 2L2-2M6 10L10 6' stroke='black' stroke-opacity='.10' stroke-width='1.2'/></svg>`);
const FIBRE = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.03 .6' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0'/></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>`);

const CSS = `${TOKENS_CSS}
html,body{margin:0}body{width:${N}px;height:${N}px;overflow:hidden;font-family:var(--font-text)}
.sc{position:relative;width:${N}px;height:${N}px;overflow:hidden}
.abs{position:absolute}
.noise{position:absolute;inset:0;background-image:${NOISE};opacity:.22;mix-blend-mode:multiply;pointer-events:none}
.studio{background:radial-gradient(120% 90% at 30% 20%,#f7f3ec 0%,#ece5d9 55%,#ddd3c3 100%)}
.paperbg{background:radial-gradient(120% 90% at 30% 15%,#f8f4ee 0%,#efe8dd 60%,#e2d8c8 100%)}
.wood{background:${GRAIN(3)},linear-gradient(100deg,#d8b78c,#cba476 40%,#d5b386 70%,#c69d6c);background-blend-mode:multiply}
.wood::after{content:"";position:absolute;inset:0;background:radial-gradient(90% 70% at 30% 20%,rgba(255,240,215,.38),transparent 60%),linear-gradient(180deg,transparent 60%,rgba(40,20,5,.18))}
.wall{background:linear-gradient(180deg,#f2ede5,#e9e2d6 70%,#e2d9cb)}
.floor{background:${GRAIN(7)},linear-gradient(180deg,#c99a6a,#b98a5a);background-blend-mode:multiply}
.light{position:absolute;inset:0;pointer-events:none;background:radial-gradient(80% 60% at 18% 8%,rgba(255,252,240,.45),transparent 60%)}
.shadow{position:absolute;border-radius:50%;background:rgba(40,25,10,.35);filter:blur(22px)}
.paper{position:absolute;background-size:cover;box-shadow:0 1px 1px rgba(30,20,10,.18),0 6px 14px rgba(30,20,10,.16),0 22px 40px rgba(30,20,10,.12)}
.paper::after{content:"";position:absolute;inset:0;background-image:${NOISE};opacity:.12;mix-blend-mode:multiply}
.matte::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(115deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 35%,rgba(0,0,0,0) 70%,rgba(0,0,0,.08) 100%);pointer-events:none}
img.fill{display:block;width:100%;height:100%}
`;
export const html = (body, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${extra}</style></head><body>${body}</body></html>`;

/* ---------- props ---------- */
const CRAYON = { red: ['#d7462e', '#a9321d', '#f08a72'], gold: ['#e9b43c', '#b8841a', '#f8d98c'], sea: ['#4f7fae', '#2f5c88', '#8fb3d8'], forest: ['#3d6e58', '#1e4a3b', '#79a58f'], rose: ['#e59a82', '#c0715a', '#f4c3b2'] };
/** A wax crayon seen from above: tip, body, paper wrapper with bands. len in px. */
export function crayon(colour, { x, y, len = 300, rot = 0, w = 30 } = {}) {
  const [c, d, l] = CRAYON[colour] || CRAYON.red;
  const id = `g${colour}${Math.round(x)}${Math.round(y)}`;
  return `<svg class="abs" style="left:${x}px;top:${y}px;width:${len}px;height:${w * 1.6}px;transform:rotate(${rot}deg);transform-origin:50% 50%;filter:drop-shadow(0 6px 5px rgba(30,15,5,.35))" viewBox="0 0 ${len} ${w * 1.6}">
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

/* ---------- books ---------- */
const bookFace = (img, extra = '') => `<div class="paper matte" style="inset:0;background-image:url(${img});${extra}"></div>`;

export function bookFront(front) {
  return html(`<div class="sc studio"><div class="noise"></div>
<div class="shadow" style="left:200px;top:980px;width:820px;height:70px"></div>
<div class="abs" style="left:170px;top:150px;width:860px;height:860px;box-shadow:0 2px 2px rgba(20,15,10,.25),0 30px 60px rgba(20,15,10,.25)">
${bookFace(front)}<div class="abs" style="left:26px;top:0;bottom:0;width:6px;background:linear-gradient(90deg,rgba(0,0,0,.18),rgba(255,255,255,.12),rgba(0,0,0,0));z-index:2"></div></div>
<div class="light"></div></div>`);
}
export function bookBack(back) { return bookFront(back); }

export function bookTable(front, { seed = 1 } = {}) {
  return html(`<div class="sc wood">
<div class="abs" style="left:150px;top:130px;width:900px;height:900px;perspective:2200px">
 <div class="abs" style="inset:0;transform:rotateX(34deg) rotateZ(-9deg);transform-style:preserve-3d">
  <div class="abs" style="left:20px;top:40px;width:820px;height:820px;background:rgba(30,15,5,.55);filter:blur(26px);transform:translateZ(-2px) translate(30px,40px)"></div>
  <div class="abs" style="left:0;top:0;width:820px;height:820px;background:#f4efe6;transform:translate(6px,8px)"></div>
  <div class="abs" style="left:0;top:0;width:820px;height:820px;background:repeating-linear-gradient(0deg,#fbf8f2 0 2px,#e6dfd2 2px 3px);transform:translate(4px,5px)"></div>
  <div class="abs" style="left:0;top:0;width:820px;height:820px">${bookFace(front)}</div>
 </div></div>
${crayons([['red', { x: 760, y: 900, len: 300, rot: -24, w: 30 }], ['sea', { x: 60, y: 980, len: 290, rot: 8, w: 30 }], ['gold', { x: 880, y: 640, len: 280, rot: 70, w: 30 }]])}
<div class="light"></div></div>`);
}

export function bookStand(front, { spine = '#1E4A3B' } = {}) {
  return html(`<div class="sc studio"><div class="noise"></div>
<div class="abs" style="left:0;right:0;bottom:0;height:330px;background:linear-gradient(180deg,#e2d8c8,#d6cab6)"></div>
<div class="shadow" style="left:330px;top:858px;width:600px;height:40px;filter:blur(12px);opacity:.85"></div>
<div class="abs" style="left:250px;top:248px;width:760px;height:760px;perspective:1800px">
 <div class="abs" style="left:60px;top:0;width:700px;height:700px;transform:rotateY(-32deg);transform-origin:0 50%;transform-style:preserve-3d">
  <div class="abs" style="left:0;top:0;width:15px;height:700px;background:linear-gradient(90deg,#173a2e,${spine} 60%,#24543f);transform:rotateY(-90deg);transform-origin:0 50%"></div>
  <div class="abs" style="left:0;top:0;width:700px;height:700px;box-shadow:20px 30px 50px rgba(20,15,10,.25)">${bookFace(front)}
   <div class="abs" style="left:22px;top:0;bottom:0;width:6px;background:linear-gradient(90deg,rgba(0,0,0,.18),rgba(255,255,255,.14),rgba(0,0,0,0));z-index:2"></div></div>
 </div></div>
<div class="light"></div></div>`);
}

/* ---------- posters ---------- */
export function posterArt(art) {
  return html(`<div class="sc paperbg"><div class="noise"></div>
<div class="shadow" style="left:260px;top:1080px;width:700px;height:50px;filter:blur(18px)"></div>
<div class="paper" style="left:${(N - 742) / 2}px;top:70px;width:742px;height:1060px;background-image:url(${art})"></div>
<div class="light"></div></div>`);
}

export function posterWall(finished, { frame = 'oak' } = {}) {
  const fr = frame === 'oak' ? 'linear-gradient(135deg,#d8b98d,#c59f6f 40%,#b88f5f)' : 'linear-gradient(135deg,#fdfbf7,#ece6dc)';
  return html(`<div class="sc wall"><div class="noise" style="opacity:.14"></div>
<div class="abs floor" style="left:0;right:0;bottom:0;height:170px"></div>
<div class="abs" style="left:0;right:0;bottom:170px;height:14px;background:#f7f4ee;box-shadow:0 2px 4px rgba(0,0,0,.12)"></div>
<div class="shadow" style="left:300px;top:840px;width:600px;height:40px;filter:blur(30px);opacity:.45"></div>
<div class="abs" style="left:320px;top:70px;width:540px;height:760px;padding:22px;background:${fr};box-shadow:0 2px 3px rgba(0,0,0,.18),14px 24px 40px rgba(40,30,20,.28)">
 <div class="abs" style="inset:22px;background:url(${finished}) center/cover;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12),inset 2px 3px 6px rgba(0,0,0,.18)"></div>
 <div class="abs" style="inset:22px;background:linear-gradient(120deg,rgba(255,255,255,.22),rgba(255,255,255,0) 38%,rgba(255,255,255,.07) 60%,rgba(255,255,255,0))"></div></div>
<div class="abs" style="left:880px;top:880px;width:150px;height:150px;border-radius:12px;background:linear-gradient(180deg,#e8dcc6,#d2c2a6);box-shadow:0 18px 26px rgba(40,25,10,.3)"></div>
${crayons([['red', { x: 880, y: 820, len: 180, rot: -80, w: 24 }], ['gold', { x: 910, y: 812, len: 190, rot: -86, w: 24 }], ['sea', { x: 940, y: 822, len: 175, rot: -96, w: 24 }], ['forest', { x: 860, y: 830, len: 170, rot: -70, w: 24 }]])}
<div class="abs" style="left:880px;top:880px;width:150px;height:150px;border-radius:12px;background:linear-gradient(180deg,#e8dcc6,#d2c2a6)"></div>
<div class="light" style="background:radial-gradient(70% 55% at 30% 10%,rgba(255,250,235,.5),transparent 65%)"></div></div>`);
}

export function posterDetail(crop) {
  return html(`<div class="sc wood">
<div class="abs" style="left:-60px;top:-40px;width:1320px;height:1280px;transform:rotate(-4deg)"><div class="paper" style="inset:0;background-image:url(${crop})"></div></div>
${crayons([['red', { x: 610, y: 820, len: 420, rot: -32, w: 40 }], ['sea', { x: 140, y: 930, len: 400, rot: 12, w: 40 }], ['gold', { x: 840, y: 360, len: 380, rot: 64, w: 40 }]])}
<div class="light"></div></div>`);
}

export function posterTube(art) {
  return html(`<div class="sc wood">
<div class="shadow" style="left:140px;top:820px;width:950px;height:90px;filter:blur(26px)"></div>
<div class="abs" style="left:110px;top:440px;width:980px;height:600px;perspective:2000px">
 <div class="abs" style="inset:0;transform:rotateX(40deg) rotateZ(-6deg);transform-origin:50% 100%">
  <div class="paper" style="left:120px;top:120px;width:760px;height:470px;background:url(${art}) 50% 64%/100% auto"></div>
  <div class="abs" style="left:110px;top:60px;width:780px;height:90px;border-radius:45px;background:linear-gradient(180deg,#fffdf8,#ece5d8 45%,#bfb4a2 85%,#d9d0c0);box-shadow:0 18px 22px rgba(40,25,10,.28)"></div>
 </div></div>
<div class="abs" style="left:120px;top:250px;width:860px;height:150px;transform:rotate(-12deg);filter:drop-shadow(0 26px 22px rgba(40,25,10,.35))">
 <div class="abs" style="left:0;top:0;width:860px;height:150px;border-radius:75px/75px;background:linear-gradient(180deg,#d9b88e,#c49a68 35%,#a87d4d 75%,#8e6639)"></div>
 <div class="abs" style="left:0;top:0;width:860px;height:150px;border-radius:75px;background-image:${NOISE};opacity:.4;mix-blend-mode:multiply"></div>
 <div class="abs" style="left:300px;top:0;width:260px;height:150px;background:linear-gradient(180deg,#fffdf8,#ede6da 40%,#cfc4b2)"></div>
 <div class="abs" style="left:330px;top:42px;width:200px;font:600 22px/1.2 var(--font-display);color:#16140f;text-align:center">Telning<br><span style="font:600 12px var(--font-text);letter-spacing:.18em">GIANT COLOURING POSTER</span></div>
 <div class="abs" style="left:822px;top:0;width:76px;height:150px;border-radius:50%;background:radial-gradient(circle at 40% 45%,#3d3a34,#16140f 70%)"></div>
</div>
<div class="light"></div></div>`);
}

/* ---------- mugs ---------- */
/** A mug rendered in SVG with the wrap mapped round the cylinder. side: centre of the visible half in wrap mm. */
export function mugSvg(wrap, { side = 57.15, handle = 'right', inside = '#FFFFFF', W = 640, cx = 600, top = 300, tilt = 0.14 } = {}) {
  const Wmm = 228.6, Hmm = 88.9, circ = Math.PI * 83, mugH = 96;
  const R = W / 2, H = (W / 83) * mugH, ry = R * tilt;
  const x0 = cx - R;
  const strips = [];
  const n = 70;
  for (let i = 0; i < n; i++) {
    const t0 = -Math.PI / 2 + (Math.PI * i) / n, t1 = -Math.PI / 2 + (Math.PI * (i + 1)) / n;
    const sx0 = cx + R * Math.sin(t0), sx1 = cx + R * Math.sin(t1);
    const u0 = side + (t0 / (2 * Math.PI)) * circ, u1 = side + (t1 / (2 * Math.PI)) * circ;
    if (u1 < 0 || u0 > Wmm) continue;
    const yoff = top + ((mugH - Hmm) / 2 / mugH) * H;
    const ph = (Hmm / mugH) * H;
    const mid = (t0 + t1) / 2;
    const sag = ry * Math.cos(mid);   // the print follows the round surface: lower at the middle
    strips.push(`<svg x="${sx0.toFixed(2)}" y="${(yoff + sag).toFixed(2)}" width="${(sx1 - sx0 + 0.6).toFixed(2)}" height="${ph.toFixed(2)}" viewBox="${u0.toFixed(3)} 0 ${(u1 - u0).toFixed(3)} ${Hmm}" preserveAspectRatio="none"><image href="${wrap}" width="${Wmm}" height="${Hmm}"/></svg>`);
  }
  const hx = handle === 'right' ? cx + R - 12 : cx - R + 12, dir = handle === 'right' ? 1 : -1;
  const hy = top + H * 0.18, hh = H * 0.6;
  const handleD = `M${hx} ${hy} c${dir * R * 0.62} ${-hh * 0.08} ${dir * R * 0.66} ${hh * 1.02} 0 ${hh}`;
  const handleCol = inside === '#FFFFFF' ? '#f4f2ee' : inside;
  return `<svg class="abs" style="left:0;top:0" width="1200" height="1200" viewBox="0 0 1200 1200">
<defs>
<linearGradient id="body" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset=".12" stop-color="#000" stop-opacity=".1"/><stop offset=".3" stop-color="#fff" stop-opacity=".0"/><stop offset=".36" stop-color="#fff" stop-opacity=".55"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
<linearGradient id="inner" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient>
<linearGradient id="hand" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
<clipPath id="mugclip"><path d="M${x0} ${top}h${W}v${H}a${R} ${ry} 0 0 1 ${-W} 0z"/></clipPath>
</defs>
<ellipse cx="${cx}" cy="${top + H + 6}" rx="${R * 1.05}" ry="${ry * 1.5}" fill="#2a1a0a" opacity=".35" filter="blur(14px)" style="filter:blur(14px)"/>
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

export function mugStudio(wrap, o = {}) {
  return html(`<div class="sc studio"><div class="noise"></div>${mugSvg(wrap, { W: 600, cx: 580, top: 330, ...o })}<div class="light"></div></div>`);
}
export function mugTable(wrap, bookFront, o = {}) {
  return html(`<div class="sc wood">
<div class="abs" style="left:640px;top:520px;width:560px;height:560px;perspective:1600px"><div class="abs" style="inset:0;transform:rotateX(40deg) rotateZ(14deg)"><div class="abs" style="left:30px;top:50px;width:470px;height:470px;background:rgba(30,15,5,.5);filter:blur(22px)"></div>${bookFace(bookFront)}</div></div>
${mugSvg(wrap, { W: 470, cx: 400, top: 420, tilt: 0.2, ...o })}
${crayon('red', { x: 120, y: 980, len: 260, rot: -12, w: 26 })}
<div class="light"></div></div>`);
}

/* ---------- tote bags ---------- */
export function toteSvg(print, { colour = 'natural', x = 270, y = 290, w = 660 } = {}) {
  const fabric = colour === 'black' ? '#211f1c' : '#ede3cf';
  const strap = colour === 'black' ? '#1a1916' : '#e4d8c0';
  const h = w * (36 / 41);
  return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
<div class="abs" style="left:${w * 0.18}px;top:${-h * 0.42}px;width:${w * 0.22}px;height:${h * 0.62}px;border:${w * 0.045}px solid ${strap};border-bottom:0;border-radius:${w * 0.2}px ${w * 0.2}px 0 0;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)"></div>
<div class="abs" style="right:${w * 0.18}px;top:${-h * 0.42}px;width:${w * 0.22}px;height:${h * 0.62}px;border:${w * 0.045}px solid ${strap};border-bottom:0;border-radius:${w * 0.2}px ${w * 0.2}px 0 0"></div>
<div class="abs" style="inset:0;border-radius:6px 6px 10px 10px;background:${fabric};box-shadow:0 30px 60px rgba(30,20,10,.28),0 6px 12px rgba(30,20,10,.18)"></div>
<div class="abs" style="left:${w * 0.21}px;top:${h * 0.14}px;width:${w * 0.58}px;height:${w * 0.58}px;background:url(${print}) center/contain no-repeat;${colour === 'black' ? 'opacity:.94' : 'mix-blend-mode:multiply;opacity:.95'}"></div>
<div class="abs" style="inset:0;border-radius:6px 6px 10px 10px;background-image:${WEAVE},${FIBRE};mix-blend-mode:${colour === 'black' ? 'screen' : 'multiply'};opacity:${colour === 'black' ? '.18' : '.7'}"></div>
<div class="abs" style="inset:0;border-radius:6px 6px 10px 10px;background:linear-gradient(90deg,rgba(0,0,0,.12),rgba(0,0,0,0) 12%,rgba(255,255,255,.08) 40%,rgba(0,0,0,0) 70%,rgba(0,0,0,.14)),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,0) 10%,rgba(0,0,0,0) 85%,rgba(0,0,0,.12))"></div>
<div class="abs" style="left:0;right:0;top:0;height:${w * 0.05}px;border-bottom:2px dashed rgba(0,0,0,.12)"></div>
</div>`;
}
export function toteStudio(print, colour) {
  return html(`<div class="sc studio"><div class="noise"></div>${toteSvg(print, { colour, x: 250, y: 380, w: 700 })}<div class="light"></div></div>`);
}
export function toteScene(print, bookFront) {
  return html(`<div class="sc wall"><div class="noise" style="opacity:.12"></div>
<div class="abs" style="left:0;right:0;top:150px;height:40px;background:linear-gradient(180deg,#c8a476,#a9804f);box-shadow:0 8px 14px rgba(40,25,10,.25)"></div>
<div class="abs" style="left:560px;top:170px;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#d9b78a,#9e7445)"></div>
<div class="abs" style="left:380px;top:270px;width:420px;height:420px;transform:rotate(-6deg);box-shadow:0 10px 20px rgba(0,0,0,.2)">${bookFace(bookFront)}</div>
${toteSvg(print, { colour: 'natural', x: 290, y: 430, w: 620 })}
<div class="abs floor" style="left:0;right:0;bottom:0;height:90px"></div>
<div class="light"></div></div>`);
}
export function toteDetail(print, colour = 'natural') {
  const fabric = colour === 'black' ? '#211f1c' : '#ede3cf';
  return html(`<div class="sc" style="background:${fabric}">
<div class="abs" style="left:-150px;top:-80px;width:1500px;height:1500px;background:url(${print}) center/contain no-repeat;mix-blend-mode:multiply;opacity:.95"></div>
<div class="abs" style="inset:0;background-image:${WEAVE},${FIBRE};background-size:14px 14px,auto;mix-blend-mode:multiply;opacity:.8"></div>
<div class="abs" style="inset:0;background:radial-gradient(90% 80% at 40% 30%,rgba(255,255,255,.12),rgba(0,0,0,.18))"></div></div>`);
}

/* ---------- postcards and greeting cards ---------- */
export function flatCard(img, { w, h, radius = 0, rot = 0, bg = 'studio' } = {}) {
  return html(`<div class="sc ${bg}"><div class="noise"></div>
<div class="shadow" style="left:${(N - w) / 2 + 30}px;top:${(N + h) / 2 - 20}px;width:${w - 60}px;height:40px;filter:blur(18px);opacity:.6"></div>
<div class="paper" style="left:${(N - w) / 2}px;top:${(N - h) / 2}px;width:${w}px;height:${h}px;border-radius:${radius}px;background-image:url(${img});transform:rotate(${rot}deg)"></div>
<div class="light"></div></div>`);
}
export function postcardPack(front) {
  const w = 760, h = 540;
  let cards = '';
  for (let i = 5; i >= 0; i--) cards += `<div class="paper" style="left:${200 + i * 16}px;top:${260 + i * 22}px;width:${w}px;height:${h}px;border-radius:22px;background-image:url(${front});transform:rotate(${-6 + i * 2.2}deg)"></div>`;
  return html(`<div class="sc studio"><div class="noise"></div>${cards}
<div class="abs" style="left:590px;top:240px;width:110px;height:640px;transform:rotate(-6deg);background:linear-gradient(90deg,#c9a77a,#b48c5c);box-shadow:0 4px 10px rgba(0,0,0,.2)"><div style="margin-top:250px;color:#fffdf8;font:600 16px var(--font-text);letter-spacing:.2em;writing-mode:vertical-rl;transform:rotate(180deg);margin-left:42px">TELNING · 10 POSTCARDS</div></div>
<div class="light"></div></div>`);
}
export function postcardScene(front, back) {
  return html(`<div class="sc wood">
<div class="paper" style="left:120px;top:200px;width:620px;height:440px;border-radius:18px;background-image:url(${back});transform:rotate(-8deg)"></div>
<div class="paper" style="left:470px;top:520px;width:620px;height:440px;border-radius:18px;background-image:url(${front});transform:rotate(7deg)"></div>
<div class="abs" style="left:160px;top:820px;width:520px;height:18px;transform:rotate(-28deg);border-radius:9px;background:linear-gradient(180deg,#3a3a3a,#111 60%,#2a2a2a);box-shadow:0 10px 12px rgba(0,0,0,.35)"></div>
<div class="abs" style="left:660px;top:640px;width:40px;height:18px;transform:rotate(-28deg);border-radius:4px;background:#c7a14a"></div>
<div class="light"></div></div>`);
}
export function cardFold(front) {
  const s = 700;
  return html(`<div class="sc studio"><div class="noise"></div>
<div class="shadow" style="left:300px;top:950px;width:640px;height:50px;filter:blur(18px)"></div>
<div class="paper" style="left:${(N - s) / 2 + 14}px;top:${(N - s) / 2 + 10}px;width:${s}px;height:${s}px;background:#f3eee5"></div>
<div class="paper" style="left:${(N - s) / 2}px;top:${(N - s) / 2}px;width:${s}px;height:${s}px;background-image:url(${front})"></div>
<div class="abs" style="left:${(N - s) / 2}px;top:${(N - s) / 2}px;width:8px;height:${s}px;background:linear-gradient(90deg,rgba(0,0,0,.18),rgba(0,0,0,0))"></div>
<div class="light"></div></div>`);
}
export function cardOpen(inside) {
  const s = 520;
  return html(`<div class="sc studio"><div class="noise"></div>
<div class="shadow" style="left:120px;top:880px;width:960px;height:60px;filter:blur(20px)"></div>
<div class="abs" style="left:80px;top:330px;width:1040px;height:540px;perspective:2400px">
 <div class="abs" style="left:520px;top:0;width:${s}px;height:${s}px;background:#fffdf8;transform:rotateY(14deg);transform-origin:0 50%;box-shadow:0 20px 40px rgba(30,20,10,.18)"><div class="noise" style="opacity:.1"></div><div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(0,0,0,.08),rgba(0,0,0,0) 25%)"></div></div>
 <div class="abs" style="left:0;top:0;width:${s}px;height:${s}px;background:#fffdf8;transform:rotateY(-14deg);transform-origin:100% 50%;box-shadow:0 20px 40px rgba(30,20,10,.18)"><div class="noise" style="opacity:.1"></div><div class="abs" style="inset:0;background:linear-gradient(270deg,rgba(0,0,0,.1),rgba(0,0,0,0) 25%)"></div></div>
</div>
<div class="abs" style="left:0;right:0;top:220px;text-align:center;font:400 30px var(--font-display);color:#4a453d">Blank inside, for your own words.</div>
<div class="light"></div></div>`);
}
export function cardEnvelope(front, { env = '#f5efe4' } = {}) {
  return html(`<div class="sc studio"><div class="noise"></div>
<div class="paper" style="left:150px;top:300px;width:760px;height:560px;background:${env};transform:rotate(-7deg)">
 <div class="abs" style="left:0;top:0;width:760px;height:560px;background:linear-gradient(160deg,rgba(0,0,0,.06),transparent 50%),linear-gradient(20deg,rgba(0,0,0,.05),transparent 50%)"></div>
 <svg class="abs" style="left:0;top:0" width="760" height="560"><path d="M0 0L380 300L760 0" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2"/></svg></div>
<div class="paper" style="left:520px;top:400px;width:560px;height:560px;background-image:url(${front});transform:rotate(6deg)"></div>
<div class="light"></div></div>`);
}
export function cardScene(front, wrap) {
  return html(`<div class="sc wall"><div class="noise" style="opacity:.12"></div>
<div class="abs floor" style="left:0;right:0;bottom:0;height:380px"></div>
<div class="abs" style="left:0;right:0;bottom:370px;height:16px;background:linear-gradient(180deg,#d5b083,#b08455);box-shadow:0 6px 10px rgba(0,0,0,.18)"></div>
<div class="abs" style="left:250px;top:250px;width:560px;height:560px;perspective:1800px"><div class="abs" style="inset:0;transform:rotateY(18deg) rotateX(2deg);box-shadow:24px 30px 40px rgba(30,20,10,.3)"><div class="paper" style="inset:0;background-image:url(${front})"></div></div></div>
${wrap ? mugSvg(wrap, { W: 300, cx: 960, top: 560, tilt: 0.16 }) : ''}
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

/* ---------- packs for organisations: several books, a poster tube and a tote bag on a table ---------- */
export function packPhoto(covers, tote, n = 3) {
  const books = covers.slice(0, n).map((c, i) => `<div class="abs" style="left:${90 + i * 120}px;top:${170 + i * 70}px;width:470px;height:470px;transform:rotate(${-12 + i * 9}deg);box-shadow:0 18px 30px rgba(30,15,5,.35)">${bookFace(c)}</div>`).join('');
  return html(`<div class="sc wood">
${books}
<div class="abs" style="left:520px;top:120px;width:620px;height:120px;transform:rotate(18deg);filter:drop-shadow(0 22px 18px rgba(40,25,10,.35))">
 <div class="abs" style="inset:0;border-radius:60px;background:linear-gradient(180deg,#d9b88e,#c49a68 35%,#a87d4d 75%,#8e6639)"></div>
 <div class="abs" style="left:200px;top:0;width:200px;height:120px;background:linear-gradient(180deg,#fffdf8,#ede6da 40%,#cfc4b2)"></div>
 <div class="abs" style="left:215px;top:34px;width:170px;font:600 19px/1.2 var(--font-display);color:#16140f;text-align:center">Telning<br><span style="font:600 10px var(--font-text);letter-spacing:.18em">GIANT COLOURING POSTER</span></div>
 <div class="abs" style="left:575px;top:0;width:60px;height:120px;border-radius:50%;background:radial-gradient(circle at 40% 45%,#3d3a34,#16140f 70%)"></div></div>
${toteSvg(tote, { colour: 'natural', x: 640, y: 640, w: 440 })}
<div class="light"></div></div>`);
}
