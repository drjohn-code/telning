// Open Graph images (1200 × 630), one per page, rendered with Playwright from a paper-theatre template and saved to
// public/og/<slug>.png. Run after copy changes: node scripts/og.mjs   (then commit the PNGs; seo.json points at them)
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const seo = JSON.parse(readFileSync(join(ROOT, 'src/data/seo.json'), 'utf8'));
const tokens = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8').replace(/url\("\/fonts\//g, `url("${pathToFileURL(join(ROOT, 'public/fonts')).href}/`);
const obj = (name) => readFileSync(join(ROOT, `art/objects/${name}.svg`), 'utf8').replace(/width="\d+" height="\d+"/, '');
const animal = (name) => readFileSync(join(ROOT, `art/animals/${name}.svg`), 'utf8').replace(/width="\d+" height="\d+"/, '');
const sci = (name) => readFileSync(join(ROOT, `art/science/${name}.svg`), 'utf8').replace(/width="\d+" height="\d+"/, '');
const pim = readFileSync(join(ROOT, 'art/pim/pim-full.svg'), 'utf8').replace(/width="\d+" height="\d+"/, '');
const lockup = readFileSync(join(ROOT, 'art/logo/lockup.svg'), 'utf8').replace(/width="[\d.]+" height="[\d.]+"/, '');

const SCENES = {
  '/': [obj('house'), obj('rocket'), obj('car'), obj('balloon')],
  '/tada': ['<div class="tile">T</div><div class="tile">A</div><div class="tile key">D</div><div class="tile">A</div>'],
  '/guide': [obj('book'), obj('crayon-red'), obj('crayon-sea'), obj('chair')],
  '/send': [obj('plane'), obj('mailbox')],
  '/about': [obj('tulip'), obj('heart'), animal('hedgehog')],
  '/pim': [pim],
  '/teachers': [sci('bookstack'), obj('blocks'), obj('apple')],
  '/privacy': [obj('shield')], '/childrens-privacy': [obj('shield'), obj('heart')], '/terms': [sci('clipboard')],
};
const html = (title, items, big) => `<!doctype html><html><head><meta charset="utf-8"><style>${tokens}
body{margin:0;width:1200px;height:630px;background:var(--paper);font-family:var(--font-text);color:var(--ink);display:grid;grid-template-columns:1.15fr 1fr;overflow:hidden}
.l{padding:64px 24px 64px 72px;display:grid;align-content:space-between}
h1{font-family:var(--font-display);font-weight:600;font-size:${title.length > 40 ? 56 : 66}px;line-height:1.02;letter-spacing:-.015em;margin:0;text-wrap:balance}
.k{font-weight:600;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:var(--red-deep);margin:0 0 18px}
.lock svg{height:72px;width:auto}
.r{position:relative;margin:40px 48px 40px 16px;background:var(--sky-light);border-radius:36px;overflow:hidden;box-shadow:var(--shadow-2)}
.hill{position:absolute;left:-4%;right:-4%;bottom:-2px;height:40%}
.objs{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;gap:4%;padding:0 8% ${big ? 6 : 14}%}
.objs>*{height:${big ? 86 : 44}%;width:auto;flex:none;filter:drop-shadow(0 10px 14px rgb(22 20 15/.16))}
.tile{display:grid;place-items:center;width:120px;height:120px;background:var(--cream);color:var(--red);border-radius:24px;font-family:var(--font-display);font-weight:600;font-size:78px;box-shadow:var(--shadow-2),inset 0 -8px 0 var(--paper-deep)}
.tile.key{background:var(--gold);color:var(--ink)}
.sun{position:absolute;top:36px;right:40px;width:110px}
</style></head><body>
<div class="l"><div><p class="k">Telning Publishing House</p><h1>${title}</h1></div><div class="lock">${lockup}</div></div>
<div class="r"><div class="sun">${obj('sun')}</div><svg class="hill" viewBox="0 0 400 160" preserveAspectRatio="none"><path d="M0 160V60C60 30 130 24 200 38s130 20 200-4v126z" fill="var(--moss)"/><path d="M0 160V96C70 72 150 68 230 84s120 12 170-6v82z" fill="var(--forest-light)"/></svg><div class="objs">${items.join('')}</div></div>
</body></html>`;

mkdirSync(join(ROOT, 'public/og'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const [path, entry] of Object.entries(seo.pages)) {
  if (path === '/404') continue;
  const slug = path === '/' ? 'home' : path.slice(1);
  const title = entry.title.replace(/\s*\|\s*Telning$/, '').replace(/^Telning:\s*/, '');
  await page.setContent(html(title, SCENES[path] || [obj('book')], path === '/pim' || path === '/tada'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(ROOT, `public/og/${slug}.png`), type: 'png' });
  entry.og = `/og/${slug}.png`;
  console.log(`og: ${slug}.png`);
}
await browser.close();
writeFileSync(join(ROOT, 'src/data/seo.json'), JSON.stringify(seo, null, 2) + '\n');
