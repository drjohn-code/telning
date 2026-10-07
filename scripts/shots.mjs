// Screenshots for review: node scripts/shots.mjs <outDir> [path=/] [widths=375,768,1280] [selector]
// Needs the preview server on http://localhost:4321 (npm run preview). Full page unless a selector is given.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [outDir = 'shots', path = '/', widths = '375,768,1280', selector = ''] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const w of widths.split(',').map(Number)) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 600 ? 812 : 900 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:4321' + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // show every reveal block, stop the slow loops, so the shot is complete and stable
  await page.addStyleTag({ content: '.tn-reveal{opacity:1!important;transform:none!important}' });
  await page.waitForTimeout(400);
  const name = `${path.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}-${w}${selector ? '-' + selector.replace(/[^a-z0-9]+/gi, '_') : ''}.png`;
  const file = join(outDir, name);
  if (selector) await page.locator(selector).first().screenshot({ path: file });
  else await page.screenshot({ path: file, fullPage: true });
  console.log(file);
  await page.close();
}
await browser.close();
