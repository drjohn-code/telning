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

test('mug variant changes the price; a pack goes into the basket with its choice', async ({ page }) => {
  await page.goto('/gifts/mugs/the-moon');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('tn-currency', 'EUR'); });
  await page.reload();
  await page.locator('label.tn-chip--radio', { hasText: 'Colour inside' }).click();
  await expect(page.locator('.tn-pdp__amount')).toHaveText('€18.90');
  await page.goto('/organisations');
  await page.locator('form.tn-packform button[type="submit"]').click();
  await expect(page.locator('#tn-drawer .tn-line__var')).toContainText('Ages 3–5');
});

test('filters on /books hide the cards that do not match', async ({ page }) => {
  await page.goto('/books');
  await expect(page.locator('#grid > li:visible')).toHaveCount(48);
  await page.locator('[data-group="type"][data-value="poster"]').click();
  await page.locator('[data-group="age"][data-value="5-7"]').click();
  await expect(page.locator('#grid > li:visible')).toHaveCount(12);
  await expect(page).toHaveURL(/type=poster/);
});

test('QR pages have no shop links and no basket', async ({ page }) => {
  for (const path of ['/guide', '/send']) {
    await page.goto(path);
    expect(await page.locator('a[href^="/books"], a[href^="/gifts"], a[href="/basket"], .tn-basketlink, #tn-drawer').count(), path).toBe(0);
  }
});
