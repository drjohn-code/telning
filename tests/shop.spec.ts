// The shop in the browser: add to basket opens the drawer with the line and the parcel fee; the currency switch
// changes every price; the filters on /books hide cards; packs; the QR pages (/guide, /send) carry no shop links.
import { test, expect } from '@playwright/test';

test('add to basket, change the currency, remove the line', async ({ page }) => {
  await page.goto('/books/star-hoppers/colouring-book-3-5');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('tn-currency', 'EUR'); });
  await page.reload();
  await expect(page.locator('.tn-pdp__amount')).toHaveText('€12.90');
  await page.locator('form.tn-buy button[type="submit"]').click();
  const drawer = page.locator('#tn-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.tn-line')).toHaveCount(1);
  await expect(drawer.locator('.tn-sum__total dd')).toHaveText('€17.80');           // 12.90 + 4.90 books parcel
  await drawer.locator('select.tn-cur').selectOption('GBP');
  await expect(drawer.locator('.tn-sum__total dd')).toHaveText('£14.80');
  await expect(page.locator('.tn-basket-count')).toHaveText('1');
  await drawer.locator('.tn-line__rm').click();
  await expect(drawer.locator('[data-basket-empty]')).toBeVisible();
});

test('gifts are the Halloween line, coming soon; a black tote is black only; a pack goes into the basket with its titles', async ({ page }) => {
  await page.goto('/gifts/mugs');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('tn-currency', 'EUR'); });
  await page.reload();
  await expect(page.locator('#grid > li')).toHaveCount(4);
  await expect(page.locator('a[href="/gifts/mugs/the-moon"]')).toHaveCount(0);
  await page.goto('/gifts/tote-bags');
  await expect(page.locator('#grid > li')).toHaveCount(8);
  await page.goto('/gifts/tote-bags/ghost-pup');
  await expect(page.locator('.tn-pdp__sub')).toContainText('Black');
  await expect(page.locator('.tn-opt__fixed')).toContainText('Black');   // one colour only, no choice
  await page.goto('/gifts/mugs/cocoa-cat');
  await expect(page.locator('.tn-gallery__thumb')).toHaveCount(3);       // table, home, hand
  await expect(page.locator('form.tn-buy')).toHaveCount(1);
  await page.goto('/organisations');
  await page.locator('form.tn-packform button[type="submit"]').click();
  await expect(page.locator('#tn-drawer .tn-line__var')).toContainText('(3–5)');   // the title carries its own age; no age step
});

test('product gallery: a thumbnail changes the big photo', async ({ page }) => {
  await page.goto('/gifts/mugs/cocoa-cat');
  const big = page.locator('.tn-gallery__main img');
  await expect(big).toHaveJSProperty('complete', true);
  expect(await big.evaluate((i: HTMLImageElement) => i.currentSrc)).toContain('-table-');
  for (const view of ['home', 'hand', 'table']) {
    await page.locator(`.tn-gallery__thumb[data-view="${view}"]`).click();
    await expect.poll(() => big.evaluate((i: HTMLImageElement) => i.currentSrc)).toContain(`-${view}-`);
    await expect(page.locator(`.tn-gallery__thumb[data-view="${view}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
});

test('filters on /books hide the cards that do not match', async ({ page }) => {
  await page.goto('/books');
  await expect(page.locator('#grid > li:visible')).toHaveCount(48);
  await page.locator('[data-group="type"][data-value="poster"]').click();
  await page.locator('[data-group="age"][data-value="5-7"]').click();
  await expect(page.locator('#grid > li:visible')).toHaveCount(12);
  await expect(page).toHaveURL(/type=poster/);
});

test('a Story Wall page: name, descriptor, trust row, delivery estimate, four pictures, no partner names', async ({ page }) => {
  await page.goto('/books/star-hoppers/story-wall-3-5');
  await expect(page.locator('h1')).toHaveText('Star Hoppers Story Wall');
  await expect(page.locator('.tn-pdp__sub')).toContainText('Story Wall · 70 × 100 cm');
  await expect(page.locator('.tn-trustrow li')).toHaveCount(3);
  await expect(page.locator('.tn-pdp__delivery')).toContainText('arrives');
  await expect(page.locator('.tn-gallery__thumb')).toHaveCount(4);       // wall, progress, art, detail
  const html = await page.content();
  expect(html).not.toMatch(/lulu|gelato|printful|giant poster/i);
  // the old URL is redirected by Vercel (vercel.json); the static preview has no such page
});

test('QR pages: the content has no shop links; the header is the same as everywhere', async ({ page }) => {
  for (const path of ['/guide', '/send']) {
    await page.goto(path);
    expect(await page.locator('main a[href^="/books"], main a[href^="/gifts"], main a[href="/basket"]').count(), path).toBe(0);
    await expect(page.locator('.tn-basketlink')).toHaveCount(1);
  }
});
