// The hidden Halloween campaign page in the browser: not linked from the header or footer, noindex; the − / + steppers
// and typed numbers; the 20% line from 11 items; checkout sends only this page's items with the page key; postcards
// switch off outside Europe and the UK; after the end date the page says so. The clock is fixed before the end date.
import { test, expect } from '@playwright/test';

const BEFORE_END = new Date('2026-10-20T12:00:00+02:00');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(BEFORE_END);
  await page.goto('/campaigns/halloween');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('tn-currency', 'EUR');
    localStorage.setItem('tn-basket', JSON.stringify([{ sku: 'mug-tea-cat', variant: '', qty: 1 }]));   // something already in the basket
  });
  await page.reload();
});

const row = (page, sku: string) => page.locator(`[data-row][data-sku="${sku}"]`);
const plus = async (page, sku: string, n = 1) => { for (let i = 0; i < n; i++) await row(page, sku).locator('[data-ostep="1"]').click(); };

test('campaign page: hidden, steppers, the 20% from 11 items, checkout with only these items', async ({ page }) => {
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('header a[href^="/campaigns"], footer a[href^="/campaigns"]')).toHaveCount(0);
  await expect(page.locator('[data-row]')).toHaveCount(24);   // 4 Story Walls (7+), 8 tote bags, 4 mugs, 4 postcards, 4 cards
  await expect(page.locator('[data-offer-sum] [data-offer-checkout]')).toBeDisabled();

  await plus(page, 'mug-cocoa-cat', 3);
  await expect(row(page, 'mug-cocoa-cat').locator('.tn-qty__in')).toHaveValue('3');
  await expect(row(page, 'mug-cocoa-cat').locator('[data-line-total]')).toHaveText('€50.70');
  await row(page, 'mug-cocoa-cat').locator('[data-ostep="-1"]').click();
  await expect(page.locator('[data-offer-prog]')).toHaveText('Add 9 more items to get 20% off.');
  await expect(page.locator('.tn-sum__off')).toHaveCount(0);

  // a typed number counts too, and is kept within the maximum
  const cards = row(page, 'cards-boo-cat').locator('.tn-qty__in');
  await cards.fill('99');
  await cards.blur();
  await expect(cards).toHaveValue('20');
  await cards.fill('9');
  await cards.blur();
  await expect(page.locator('[data-offer-prog]')).toHaveText('You get 20% off every item.');
  // 2 × 16.90 + 9 × 19.90 = 212.90; 20% = 42.58; shipping: mugs 5.90 + 1.00, cards 3.90 + 8 × 1.00 = 18.80
  await expect(page.locator('[data-offer-totals] .tn-sum__off dd')).toHaveText('−€42.58');
  await expect(page.locator('[data-offer-totals] .tn-sum__total dd')).toHaveText('€189.12');

  // the choice stays after a reload
  await page.reload();
  await expect(cards).toHaveValue('9');
  await expect(row(page, 'mug-cocoa-cat').locator('.tn-qty__in')).toHaveValue('2');

  let sent: any = null;
  await page.route('**/api/checkout', async (route) => { sent = route.request().postDataJSON(); await route.fulfill({ json: { ok: false, error: 'notReady' } }); });
  await page.locator('[data-offer-sum] [data-offer-checkout]').click();
  await expect(page.locator('[data-offer-msg]')).toHaveText('The shop opens very soon. Your basket is saved on this device.');
  expect(sent.offer).toBe('halloween');
  expect(sent.currency).toBe('EUR');
  expect(sent.marketing).toBe(false);
  expect(sent.items).toEqual([{ sku: 'mug-cocoa-cat', variant: '', qty: 2 }, { sku: 'cards-boo-cat', variant: '', qty: 9 }]);
  expect(await page.evaluate(() => localStorage.getItem('tn-basket'))).toContain('mug-tea-cat');   // the basket is not touched
});

test('campaign page: a tote bag goes with its one colour; postcards switch off in US dollars', async ({ page }) => {
  await plus(page, 'tote-broom-cat');
  await plus(page, 'postcards-moonlight-cat', 2);
  await page.locator('[data-offer-sum] select.tn-cur').selectOption('USD');
  await expect(row(page, 'postcards-moonlight-cat').locator('.tn-qty__in')).toHaveValue('0');
  await expect(row(page, 'postcards-moonlight-cat').locator('.tn-qty__in')).toBeDisabled();
  await expect(row(page, 'postcards-moonlight-cat').locator('[data-region-note]')).toBeVisible();
  await expect(row(page, 'tote-broom-cat').locator('[data-line-total]')).toHaveText('$26.90');
  let sent: any = null;
  await page.route('**/api/checkout', async (route) => { sent = route.request().postDataJSON(); await route.fulfill({ json: { ok: false, error: 'stripe' } }); });
  await page.locator('[data-offer-sum] [data-offer-checkout]').click();
  await expect(page.locator('[data-offer-msg]')).toBeVisible();
  expect(sent.items).toEqual([{ sku: 'tote-broom-cat', variant: 'black', qty: 1 }]);
  expect(sent.currency).toBe('USD');
});

test('campaign page: the phone bar shows the count and total while the summary is out of view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await plus(page, 'poster-big-days-5-7', 2);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  const bar = page.locator('[data-offer-mbar]');
  await expect(bar).toBeVisible();
  await expect(bar.locator('[data-obar-count]')).toHaveText('2 items');
  await expect(bar.locator('[data-obar-prog]')).toHaveText('Add 9 more items to get 20% off.');
});

test('campaign page: after 31 October the page says the offer has ended', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-01T09:00:00+01:00'));
  await page.reload();
  await expect(page.locator('[data-offer-ended]')).toBeVisible();
  await expect(row(page, 'mug-cocoa-cat').locator('[data-ostep="1"]')).toBeDisabled();
  await expect(page.locator('[data-offer-sum] [data-offer-checkout]')).toBeDisabled();
});

test('thank-you page after a campaign order: clears that page\'s choice, keeps the basket', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('tn-offer-halloween', JSON.stringify({ 'mug-cocoa-cat': 2 })));
  await page.route('**/api/order**', (route) => route.fulfill({ json: { ok: false } }));
  await page.goto('/order/thanks?session_id=cs_test_x&offer=halloween');
  expect(await page.evaluate(() => localStorage.getItem('tn-offer-halloween'))).toBe('{}');
  expect(await page.evaluate(() => localStorage.getItem('tn-basket'))).toContain('mug-tea-cat');
});

test('Christmas & New Year page: every-day mugs and bags named as such, cards with their occasion, 20% from 11 items', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T12:00:00+01:00'));
  await page.goto('/campaigns/new-year');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('tn-currency', 'EUR'); });
  await page.reload();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('[data-row]')).toHaveCount(32);   // 4 Story Walls (7+), 8 tote bags, 12 mugs, 4 postcards, 4 cards
  await expect(page.locator('#sec-tote')).toHaveText('Tote bags for every day');
  await expect(page.locator('#sec-mug')).toHaveText('Mugs for every day');
  await expect(row(page, 'postcards-lantern-cat').locator('.tn-orow__sub')).toHaveText('Christmas · Pack of 10 · A6');
  await expect(row(page, 'cards-pom-pom-puppies').locator('.tn-orow__sub')).toHaveText('New Year · Pack of 10 with envelopes');
  await row(page, 'postcards-midnight-cats').locator('.tn-qty__in').fill('6');
  await plus(page, 'cards-scarf-cat', 4);
  await expect(page.locator('[data-offer-prog]')).toHaveText('Add 1 more item to get 20% off.');
  await plus(page, 'poster-round-the-year-5-7');
  await expect(page.locator('[data-offer-prog]')).toHaveText('You get 20% off every item.');
  // 6 × 12.90 + 4 × 19.90 + 19.90 = 176.90; 20% = 35.38
  await expect(page.locator('[data-offer-totals] .tn-sum__off dd')).toHaveText('−€35.38');
});

test('/campaigns: two blocks open the two offer pages; not linked from the header or footer; an ended offer says so', async ({ page }) => {
  await page.goto('/campaigns');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('header a[href^="/campaigns"], footer a[href^="/campaigns"]')).toHaveCount(0);
  const cards = page.locator('[data-offer-card]');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).locator('h2')).toHaveText('Halloween');
  await expect(cards.nth(1).locator('h2')).toHaveText('Christmas & New Year');
  await expect(cards.nth(0).locator('[data-offer-when]')).toHaveText('Until 31 October');
  await expect(cards.nth(1).locator('.tn-shophero__pts li')).toHaveText(['Story Walls', 'Tote bags', 'Mugs', 'Postcards', 'Greeting cards']);   // no "for every day" on the badges (John)
  await cards.nth(1).locator('a').click();
  await expect(page).toHaveURL(/\/campaigns\/new-year$/);
  await expect(page.locator('.tn-crumbs a[href="/campaigns"]')).toHaveText('Offers');
  await page.clock.setFixedTime(new Date('2026-11-01T09:00:00+01:00'));
  await page.goto('/campaigns');
  await expect(page.locator('[data-offer-card]').nth(0).locator('[data-offer-when]')).toHaveText('This offer has ended');
  await expect(page.locator('[data-offer-card]').nth(1).locator('[data-offer-when]')).toHaveText('Until 31 December');
});

test('/campaigns: both offer buttons keep the same red when the mouse is on a block; "20% off" is big', async ({ page }) => {
  await page.goto('/campaigns');
  const cards = page.locator('[data-offer-card]');
  const red = await cards.nth(0).locator('.tn-offercard__btn').evaluate((b) => getComputedStyle(b).backgroundColor);
  await cards.nth(1).locator('h2').hover();   // on the block, not on the button
  await page.waitForTimeout(300);
  expect(await cards.nth(1).locator('.tn-offercard__btn').evaluate((b) => getComputedStyle(b).backgroundColor)).toBe(red);
  await expect(cards.nth(1).locator('.tn-offercard__pct')).toHaveText('20% off');
  const size = await cards.nth(1).locator('.tn-offercard__pct').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(size).toBeGreaterThanOrEqual(40);
});
