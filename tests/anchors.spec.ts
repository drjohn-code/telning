// A5: after any anchor link, the top edge of the section sits at the bottom edge of the sticky header (±1 px),
// at 375, 768 and 1280 px, for the header, the footer, the hero button and "How our books work".
import { test, expect, type Page } from '@playwright/test';

const WIDTHS = [375, 768, 1280];
const LINKS = [
  { name: 'header Ages', sel: 'header nav a[href="/#ages"]', id: 'ages', menu: true },
  { name: 'header Series', sel: 'header nav a[href="/#series"]', id: 'series', menu: true },
  { name: 'header Skills', sel: 'header nav a[href="/#skills"]', id: 'skills', menu: true },
  { name: 'hero button', sel: '.tn-hero a.tn-btn[href="#ages"]', id: 'ages', menu: false },
  { name: 'hero "How our books work"', sel: '.tn-hero a[href="#skills"]', id: 'skills', menu: false },
  { name: 'footer Ages', sel: 'footer a[href="/#ages"]', id: 'ages', menu: false },
  { name: 'footer Series', sel: 'footer a[href="/#series"]', id: 'series', menu: false },
  { name: 'footer Skills', sel: 'footer a[href="/#skills"]', id: 'skills', menu: false },
];

/** Wait until the page has stopped scrolling (smooth scroll is on). */
async function settled(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    let last = -1, still = 0, frames = 0;
    const tick = () => {
      if (window.scrollY === last) still++; else { still = 0; last = window.scrollY; }
      if (still >= 8 || ++frames > 240) resolve(); else requestAnimationFrame(tick);
    };
    tick();
  }));
}

async function gap(page: Page, id: string) {
  return page.evaluate((id) => {
    const el = document.getElementById(id)!.getBoundingClientRect();
    const header = document.querySelector('.tn-header')!.getBoundingClientRect();
    return { sectionTop: el.top, headerBottom: header.bottom, focus: document.activeElement?.id || '' };
  }, id);
}

for (const width of WIDTHS) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: width < 600 ? 812 : 900 } });

    for (const link of LINKS) {
      test(`${link.name} lands under the header`, async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => document.fonts.ready);
        if (link.menu && width < 1024) await page.locator('.tn-menu-btn').click();
        await page.locator(link.sel).click();
        await settled(page);
        const g = await gap(page, link.id);
        expect(Math.abs(g.sectionTop - g.headerBottom), `section top ${g.sectionTop} vs header bottom ${g.headerBottom}`).toBeLessThanOrEqual(1);
        expect(g.focus, 'focus moves to the section heading').toBe(`${link.id}-h`);
        if (link.menu && width < 1024) await expect(page.locator('#tn-nav')).not.toHaveClass(/is-open/);
      });
    }

    test('a page that opens with /#series lands under the header', async ({ page }) => {
      await page.goto('/#series');
      await page.waitForLoadState('load');
      await page.waitForTimeout(500);
      await settled(page);
      const g = await gap(page, 'series');
      expect(Math.abs(g.sectionTop - g.headerBottom)).toBeLessThanOrEqual(1);
    });
  });
}
