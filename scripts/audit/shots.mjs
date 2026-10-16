// Audit screenshots: every page template at 375, 768, 1280, 1440 and 1920 px, above the fold and full page.
// node scripts/audit/shots.mjs <outDir> [all|templates]   (needs `npx astro preview --port 4321 --host 127.0.0.1`)
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [outDir = 'audit/before', mode = 'templates'] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const WIDTHS = [375, 768, 1280, 1440, 1920];
const HEIGHT = { 375: 812, 768: 1024, 1280: 800, 1440: 900, 1920: 1080 };

const { catalog } = await import('../../server/catalog-data.js');
const STATIC = ['/', '/books', '/gifts', '/basket', '/organisations', '/materials', '/shipping-returns', '/about', '/tada', '/guide', '/send', '/pim', '/teachers', '/privacy', '/childrens-privacy', '/terms', '/404', '/order/thanks',
  '/books/star-hoppers', '/gifts/mugs', '/gifts/tote-bags', '/gifts/postcards', '/gifts/greeting-cards'];
const TEMPLATES = ['/books/star-hoppers/colouring-book-3-5', '/books/star-hoppers/story-wall-3-7', '/gifts/mugs/cocoa-cat', '/gifts/tote-bags/ghost-pup', '/gifts/postcards/pumpkin-pup', '/gifts/greeting-cards/pumpkin-puppies'];
const ALL = mode === 'all' ? [...STATIC, ...catalog.products.map((p) => p.url)] : [...STATIC, ...TEMPLATES];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const log = [];
for (const path of ALL) {
  const slug = path === '/' ? 'home' : path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-');
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: HEIGHT[w] }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400 && !/\/404$/.test(path)) errors.push(`${r.status()} ${r.url()}`); });
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: '.tn-reveal{opacity:1!important;transform:none!important} *{animation-play-state:paused!important}' });
    await page.waitForTimeout(300);
    const dims = await page.evaluate(() => ({ docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, hero: (document.querySelector('.tn-hero, .tn-shophero, .tn-pdp, .tn-pagehero') || {}).getBoundingClientRect?.()?.bottom }));
    await page.screenshot({ path: join(outDir, `${slug}-${w}-fold.png`) });
    await page.screenshot({ path: join(outDir, `${slug}-${w}-full.png`), fullPage: true });
    log.push({ path, width: w, status: res?.status(), docHeight: dims.docH, overflow: dims.docW > w, heroBottom: dims.hero, errors });
    await page.close();
  }
  console.log(path);
}
await browser.close();
writeFileSync(join(outDir, 'log.json'), JSON.stringify(log, null, 2));
console.log(`${log.length} shots in ${outDir}`);
