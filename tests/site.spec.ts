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

test('keyboard only: the send form, step by step, with a visible focus ring', async ({ page }) => {
  await page.goto('/send');
  async function tabUntil(pred: (id: string) => boolean, max = 120) {
    const seen = new Set<string>();
    for (let i = 0; i < max; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        const cs = getComputedStyle(el);
        const wrap = el.closest('.tn-radio, .tn-chip-opt, .tn-check');
        const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (wrap ? getComputedStyle(wrap).outlineStyle !== 'none' : false) || el.classList.contains('tn-photo__input');
        return { id: el.id || el.getAttribute('name') || el.getAttribute('data-goto') && `goto-${el.getAttribute('data-goto')}` || el.tagName, ring };
      });
      if (!info) continue;
      seen.add(info.id);
      if (['f-email', 'f-name', 'f-age', 'consentGuardian', 'consentCard'].includes(info.id)) expect(info.ring, `focus ring on ${info.id}`).toBe(true);
      if (pred(info.id)) return seen;
    }
    return seen;
  }
  // step 1 by keyboard: the fields, then the Next button
  let seen = await tabUntil((id) => id === 'f-photo');
  for (const id of ['f-email', 'f-name', 'f-age', 'f-photo']) expect(seen.has(id), `reached ${id}`).toBe(true);
  await page.fill('#f-email', 'parent@example.com'); await page.fill('#f-name', 'Noa'); await page.selectOption('#f-age', '4');
  await page.setInputFiles('#f-photo', { name: 'd.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  await page.locator('#part-1 [data-goto="2"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#part-2')).toBeVisible();
  // step 2 by keyboard: the chips and boxes, then Next
  seen = await tabUntil((id) => id === 'goto-3');
  expect([...seen].some((id) => id.startsWith('q_')), 'reached the questions').toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('#part-3')).toBeVisible();
  // step 3: the consents and the submit button
  seen = await tabUntil((id) => id === 'BUTTON');
  for (const id of ['consentGuardian', 'consentCard', 'consentAnswers', 'consentShare']) expect(seen.has(id), `reached ${id}`).toBe(true);
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
