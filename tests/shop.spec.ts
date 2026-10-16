// The shop in the browser: add to basket opens the drawer with the line and the parcel fee; the currency switch
// changes every price; the filters on /books hide cards; packs; the QR pages (/guide, /send) carry no shop links.
import { test, expect } from '@playwright/test';

test('add to basket, change the currency, remove the line', async ({ page }) => {
  await page.goto('/books/star-hoppers/story-wall-3-5');   // a Story Wall: the books are hidden for now (BOOKS_HIDDEN)
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('tn-currency', 'EUR'); });
  await page.reload();
  await expect(page.locator('.tn-pdp__amount')).toHaveText('€19.90');
  await page.locator('form.tn-buy button[type="submit"]').click();
  const drawer = page.locator('#tn-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.tn-line')).toHaveCount(1);
  await expect(drawer.locator('.tn-sum__total dd')).toHaveText('€26.80');           // 19.90 + 6.90 Story Walls parcel
  await drawer.locator('select.tn-cur').selectOption('GBP');
  await expect(drawer.locator('.tn-sum__total dd')).toHaveText('£23.80');
  await expect(page.locator('.tn-basket-count')).toHaveText('1');
  await drawer.locator('.tn-line__rm').click();
  await expect(drawer.locator('[data-basket-empty]')).toBeVisible();
});

test('gifts are the Halloween line, coming soon; a black tote is black only; a pack goes into the basket with its titles', async ({ page }) => {
  await page.goto('/gifts/mugs');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('tn-currency', 'EUR'); });
  await page.reload();
  await expect(page.locator('#grid > li')).toHaveCount(16);   // 4 Halloween + 12 every day (8 animals, 4 plants)
  await page.locator('button.tn-chip[data-group="animal"][data-value="plant"]').first().click();
  await expect(page.locator('#grid > li:visible')).toHaveCount(4);   // the Plants chip: the four plant mugs
  await page.locator('button.tn-chip[data-group="animal"][data-value=""]').first().click();
  await expect(page.locator('a[href="/gifts/mugs/the-moon"]')).toHaveCount(0);
  await page.goto('/gifts/tote-bags');
  await expect(page.locator('#grid > li')).toHaveCount(16);   // 8 Halloween + 8 every day
  await page.goto('/gifts/tote-bags/ghost-pup');
  await expect(page.locator('.tn-pdp__sub')).toContainText('Black');
  await expect(page.locator('.tn-opt__fixed')).toContainText('Black');   // one colour only, no choice
  await page.goto('/gifts/mugs/cocoa-cat');
  await expect(page.locator('.tn-gallery__thumb')).toHaveCount(3);       // table, home, hand
  await expect(page.locator('form.tn-buy')).toHaveCount(1);
  await page.goto('/organisations');
  await page.locator('form.tn-packform button[type="submit"]').click();
  await expect(page.locator('#tn-drawer .tn-line__var')).toContainText('Story Wall (3–7)');   // a pack holds Story Walls, each with its age
});

test('gifts filter: Girls / Boys picks the birthday cards for girls or for boys', async ({ page }) => {
  await page.goto('/gifts/postcards');
  const shown = () => page.locator('#grid > li:visible');
  await expect(shown()).toHaveCount(16);
  await page.locator('button.tn-chip[data-group="child"][data-value="girl"]').first().click();
  await expect(shown()).toHaveCount(4);
  await expect(page).toHaveURL(/child=girl/);
  await page.locator('button.tn-chip[data-group="animal"][data-value="dog"]').first().click();
  await expect(shown()).toHaveCount(2);   // a dog and a girl, dogs and a girl
  await page.locator('button.tn-chip[data-group="child"][data-value="boy"]').first().click();
  await expect(shown()).toHaveCount(2);
  // every product page starts its details with the art style; the technique follows the product
  for (const [url, technique] of [['/gifts/postcards/present-parade', 'coloured pencil'], ['/gifts/postcards/lantern-cat', 'Gouache'], ['/gifts/mugs/cocoa-cat', 'Embroidery'], ['/books/big-days/story-wall-3-5', 'line art']]) {
    await page.goto(url);
    await expect(page.locator('.tn-pdp__spec dt').first()).toHaveText('Art style');
    await expect(page.locator('.tn-pdp__spec dd').first()).toContainText(technique);
  }
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
  await page.goto('/');
  await expect(page.locator('.tn-agechip--link')).toHaveCount(2);     // 3–7 and 7+ link to the shop; 1–3 and Adults are coming soon
  await page.locator('.tn-agechip--link').last().click();              // 7+
  await expect(page).toHaveURL(/\/books\?age=7%2B$/);
  await expect(page.locator('#grid > li:visible')).toHaveCount(12);
  await page.goto('/books');
  await expect(page.locator('#grid > li:visible')).toHaveCount(24);   // the 24 Story Walls; the books are hidden for now (BOOKS_HIDDEN)
  await expect(page.locator('[data-group="type"]')).toHaveCount(0);    // one type only, so no Type filter
  await expect(page.locator('[data-group="age"]')).toHaveCount(3);     // All, 3–7, 7+; 1–3 and Adults are "coming soon"
  await page.locator('[data-group="age"][data-value="3-7"]').click();
  await expect(page.locator('#grid > li:visible')).toHaveCount(12);   // the big-shape Story Walls
  await expect(page.locator('#grid > li:visible .tn-pcard__tag').first()).toHaveText('Ages 3–7');
  await page.locator('[data-group="age"][data-value="7+"]').click();
  await expect(page.locator('#grid > li:visible')).toHaveCount(12);   // the detailed Story Walls
  await expect(page.locator('#grid > li:visible .tn-pcard__tag').first()).toHaveText('Ages 7+');
  await expect(page).toHaveURL(/age=7/);
  expect((await page.goto('/books/star-hoppers/colouring-book-3-5'))?.status()).toBe(404);   // a hidden book has no page
});

test('a Story Wall page: name, descriptor, trust row, delivery estimate, two pictures, no partner names', async ({ page }) => {
  await page.goto('/books/star-hoppers/story-wall-3-5');
  await expect(page.locator('h1')).toHaveText('Star Hoppers Story Wall');
  await expect(page.locator('.tn-pdp__sub')).toContainText('Story Wall · 70 × 100 cm');
  await expect(page.locator('.tn-trustrow li')).toHaveCount(3);
  await expect(page.locator('.tn-pdp__delivery')).toContainText('arrives');
  await expect(page.locator('.tn-gallery__thumb')).toHaveCount(2);       // progress (first), wall
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
