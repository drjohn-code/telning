// Site-wide checks (brief section 7): no dead internal links and no coming-soon links; reduced motion shows every
// final state with nothing moving; the /send form and every page work keyboard-only with a visible focus ring.
import { test, expect } from '@playwright/test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
function* htmlFiles(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) yield* htmlFiles(p); else if (f.endsWith('.html')) yield p; }
}
const PAGES = ['/', '/tada', '/guide', '/send', '/about', '/pim', '/teachers', '/privacy', '/childrens-privacy', '/terms'];

test('no dead internal links, no coming-soon links', () => {
  const dead: string[] = [], soon: string[] = [];
  for (const file of htmlFiles(DIST)) {
    const html = readFileSync(file, 'utf8');
    for (const m of html.matchAll(/<a [^>]*href="([^"]+)"/g)) {
      const href = m[1];
      if (!href.startsWith('/')) continue;
      const path = href.split('#')[0].split('?')[0];
      if (!path) continue;
      if (/^\/series\/|^\/books/.test(path)) soon.push(`${file}: ${href}`);
      if (path === '/api/story-card') continue;                      // the Vercel function, not a static file
      const ok = path === '/' || existsSync(join(DIST, path.slice(1), 'index.html')) || existsSync(join(DIST, path.slice(1))) || existsSync(join(DIST, path.slice(1) + '.html'));
      if (!ok) dead.push(`${file}: ${href}`);
    }
  }
  expect(dead, 'dead links').toEqual([]);
  expect(soon, 'links to coming-soon routes').toEqual([]);
});

test('reduced motion: final states shown, nothing animates', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  for (const path of ['/tada', '/guide', '/send', '/about', '/pim']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const views = [...document.querySelectorAll('.tn-view')].map((el) => getComputedStyle(el).getPropertyValue('--p').trim());
      const running = document.getAnimations().filter((a) => a.playState === 'running').length;
      const hidden = [...document.querySelectorAll('.tn-reveal, .tn-road__stop, .tn-book3d__leaf, .ss-plane, .ss-card')].filter((el) => getComputedStyle(el).opacity === '0' && !el.closest('[hidden]'));
      return { views, running, hidden: hidden.length };
    });
    expect(r.views.every((v) => v === '1'), `${path}: --p is 1 on every story`).toBe(true);
    expect(r.running, `${path}: running animations`).toBe(0);
    expect(r.hidden, `${path}: elements left invisible`).toBe(0);
  }
  await ctx.close();
});

test('keyboard only: the send form fields are reachable with a visible focus ring', async ({ page }) => {
  await page.goto('/send');
  const seen = new Set<string>();
  for (let i = 0; i < 160; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      const wrap = el.closest('.tn-radio, .tn-chip-opt, .tn-check');
      const wrapRing = wrap ? getComputedStyle(wrap).outlineStyle !== 'none' : false;
      return { id: el.id || el.getAttribute('name') || el.tagName, ring: ring || wrapRing || el.classList.contains('tn-photo__input') };
    });
    if (!info) continue;
    seen.add(info.id);
    if (['f-email', 'f-name', 'f-age', 'ending', 'consentGuardian', 'consentCard'].includes(info.id)) expect(info.ring, `focus ring on ${info.id}`).toBe(true);
  }
  for (const id of ['f-email', 'f-name', 'f-age', 'ending', 'f-photo', 'consentGuardian', 'consentCard', 'consentAnswers', 'consentShare']) expect(seen.has(id), `reached ${id}`).toBe(true);
  expect([...seen].some((s) => s === 'BUTTON'), 'reached the submit button').toBe(true);
});

test('every page: skip link, one main, header menu works with the keyboard on phones', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  for (const path of PAGES) {
    await page.goto(path);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.className.includes('tn-skip')), `${path}: first Tab is the skip link`).toBe(true);
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');     // lockup, then the menu button
    await page.keyboard.press('Enter');
    expect(await page.locator('#tn-nav').evaluate((n) => n.classList.contains('is-open')), `${path}: menu opens with Enter`).toBe(true);
  }
  await ctx.close();
});
