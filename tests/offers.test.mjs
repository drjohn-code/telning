// The hidden campaign pages (/campaigns/<key>): which products each page lists, and the 20% rule the server applies at
// checkout (11 or more items from one page, before the end date, a Stripe coupon, never decided by the browser).
// Run: node --test tests/offers.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, offers, shopPages } from '../server/catalog-data.js';
import { offerCheck, offerOpen, ensureCoupon } from '../server/offers.js';
import { resolveLines } from '../server/catalog.js';
import { handleCheckout } from '../server/checkout.js';
import { orderFrom } from '../server/orders.js';
import { orderData, render } from '../server/emails.js';
import { formEncode } from '../server/stripe.js';

const BEFORE = Date.parse('2026-10-20T12:00:00+02:00');
const AFTER = Date.parse('2026-11-01T00:00:01+01:00');
const halloween = offers.byKey.get('halloween');
// eleven items from the Halloween page: 2 Story Walls, 3 tote bags (with their one colour), 3 mugs, 2 postcards, 1 pack of cards
const ELEVEN = [
  { sku: 'poster-big-days-3-5', qty: 1 }, { sku: 'poster-big-days-5-7', qty: 1 },
  { sku: 'tote-moon-cat', variant: 'natural', qty: 2 }, { sku: 'tote-broom-cat', variant: 'black', qty: 1 },
  { sku: 'mug-cocoa-cat', qty: 3 }, { sku: 'postcards-moonlight-cat', qty: 2 }, { sku: 'cards-boo-cat', qty: 1 },
];
const TEN = ELEVEN.map((it) => (it.sku === 'mug-cocoa-cat' ? { ...it, qty: 2 } : it));

/** A fake Stripe: records the calls; the coupon is missing at first (404) unless `coupon` is given. */
function fakeStripe({ coupon = null, createStatus = 200 } = {}) {
  const calls = [];
  const fn = async (method, path, params) => {
    calls.push({ method, path, params });
    if (path.startsWith('/coupons/')) return coupon ? { status: 200, json: coupon } : { status: 404, json: { error: { code: 'resource_missing' } } };
    if (path === '/coupons') return { status: createStatus, json: createStatus === 200 ? { id: params.id } : { error: { code: 'resource_already_exists' } } };
    return { status: 200, json: { url: 'https://checkout.stripe.com/c/pay/x' } };
  };
  fn.calls = calls;
  return fn;
}
const run = (body, stripe, now = BEFORE) => handleCheckout({ body, origin: 'https://telning.com' }, { catalog, offers, stripe, open: true, now: () => now });

test('offers: the Halloween page lists the Big Days Story Walls and every Halloween tote bag, mug, postcard and card', () => {
  assert.equal(halloween.path, '/campaigns/halloween');
  assert.deepEqual(halloween.sections.map((s) => s.type), ['poster', 'tote', 'mug', 'postcards', 'cards']);
  assert.deepEqual(halloween.sections.map((s) => s.products.length), [2, 8, 4, 4, 4]);
  assert.deepEqual(halloween.sections[0].products.map((p) => p.sku), ['poster-big-days-3-5', 'poster-big-days-5-7']);
  assert.ok(halloween.sections.slice(1).every((s) => s.products.every((p) => p.occasion === 'halloween' && !p.soon && !p.retired)));
  assert.equal(halloween.skus.size, 22);
  assert.equal(offers.rule.minItems, 11);
  assert.equal(offers.rule.percent, 20);
});

test('offers: the campaign pages are hidden: noindex and not in the sitemap', () => {
  const e = shopPages['/campaigns/halloween'];
  assert.ok(e, 'has an SEO entry');
  assert.equal(e.noindex, true);
  assert.equal(e.sitemap, false);
  assert.ok(e.title.length <= 60);
  assert.ok(e.description.length >= 140 && e.description.length <= 160);
});

test('offers: open until 31 October 23:59 Swedish time', () => {
  assert.equal(offerOpen(halloween, Date.parse('2026-10-31T23:59:00+01:00')), true);
  assert.equal(offerOpen(halloween, Date.parse('2026-11-01T00:00:00+01:00')), false);
});

test('offers: 10 items → no discount, 11 → 20%; an unknown page, an item from elsewhere or a late order are refused', () => {
  assert.equal(offerCheck(offers, 'halloween', resolveLines(catalog, TEN), BEFORE).discount, false);
  const c = offerCheck(offers, 'halloween', resolveLines(catalog, ELEVEN), BEFORE);
  assert.equal(c.count, 11);
  assert.equal(c.discount, true);
  assert.throws(() => offerCheck(offers, 'easter', resolveLines(catalog, ELEVEN), BEFORE), /offer/);
  assert.throws(() => offerCheck(offers, 'halloween', resolveLines(catalog, [...ELEVEN, { sku: 'mug-tea-cat', qty: 1 }]), BEFORE), /sku/);
  assert.throws(() => offerCheck(offers, 'halloween', resolveLines(catalog, ELEVEN), AFTER), /ended/);
});

test('checkout from the campaign page, 11 items: the 20% coupon, no promo-code box, full unit prices, back to the page', async () => {
  const stripe = fakeStripe();
  const r = await run({ currency: 'EUR', items: ELEVEN, offer: 'halloween' }, stripe);
  assert.equal(r.status, 200);
  assert.deepEqual(stripe.calls.map((c) => `${c.method} ${c.path}`), ['GET /coupons/telning-offer-20', 'POST /coupons', 'POST /checkout/sessions']);
  assert.deepEqual(stripe.calls[1].params, { id: 'telning-offer-20', percent_off: 20, duration: 'once', name: '20% off, 11 or more items' });
  const p = stripe.calls[2].params;
  assert.deepEqual(p.discounts, [{ coupon: 'telning-offer-20' }]);
  assert.equal(p.allow_promotion_codes, undefined, 'Stripe takes a coupon or the promo-code box, never both');
  assert.equal(p.line_items.find((l) => l.price_data.product_data.metadata.sku === 'mug-cocoa-cat').price_data.unit_amount, 1690, 'the unit price stays the catalogue price; Stripe shows the 20% as its own line');
  assert.equal(p.metadata.offer, 'halloween');
  assert.equal(p.metadata.discount, 'yes');
  assert.match(p.success_url, /\/order\/thanks\?session_id=\{CHECKOUT_SESSION_ID\}&offer=halloween$/);
  assert.equal(p.cancel_url, 'https://telning.com/campaigns/halloween');
  assert.match(formEncode(p).toString(), /discounts%5B0%5D%5Bcoupon%5D=telning-offer-20/);
});

test('checkout from the campaign page, 10 items: full price, the promo-code box stays', async () => {
  const stripe = fakeStripe();
  const r = await run({ currency: 'EUR', items: TEN, offer: 'halloween' }, stripe);
  assert.equal(r.status, 200);
  assert.deepEqual(stripe.calls.map((c) => c.path), ['/checkout/sessions'], 'no coupon asked for');
  const p = stripe.calls[0].params;
  assert.equal(p.discounts, undefined);
  assert.equal(p.allow_promotion_codes, true);
  assert.equal(p.metadata.discount, 'no');
});

test('checkout: the coupon is made once; a coupon with another percentage is never used', async () => {
  const ok = fakeStripe({ coupon: { id: 'telning-offer-20', percent_off: 20, valid: true } });
  assert.equal((await run({ currency: 'EUR', items: ELEVEN, offer: 'halloween' }, ok)).status, 200);
  assert.deepEqual(ok.calls.map((c) => `${c.method} ${c.path}`), ['GET /coupons/telning-offer-20', 'POST /checkout/sessions']);
  const wrong = fakeStripe({ coupon: { id: 'telning-offer-20', percent_off: 50, valid: true } });
  const r = await run({ currency: 'EUR', items: ELEVEN, offer: 'halloween' }, wrong);
  assert.equal(r.status, 502);
  assert.ok(!wrong.calls.some((c) => c.path === '/checkout/sessions'), 'no payment page without the right discount');
  assert.equal(await ensureCoupon(fakeStripe({ createStatus: 400 }), offers.rule), 'telning-offer-20', 'made by another checkout at the same moment');
});

test('checkout: the browser cannot get the 20% for other items, after the end date or for an unknown page', async () => {
  for (const [body, now, error] of [
    [{ currency: 'EUR', items: [...ELEVEN, { sku: 'mug-tea-cat', qty: 1 }], offer: 'halloween' }, BEFORE, 'sku'],
    [{ currency: 'EUR', items: ELEVEN, offer: 'halloween' }, AFTER, 'ended'],
    [{ currency: 'EUR', items: ELEVEN, offer: 'black-friday' }, BEFORE, 'offer'],
    [{ currency: 'USD', items: ELEVEN, offer: 'halloween' }, BEFORE, 'region'],   // postcards: Europe and the UK only
  ]) {
    const stripe = fakeStripe();
    const r = await run(body, stripe, now);
    assert.equal(r.status, 400);
    assert.equal(r.body.error, error);
    assert.equal(stripe.calls.length, 0, `${error}: nothing sent to Stripe`);
  }
  // the normal basket (no offer) never gets a coupon, however many items it has
  const stripe = fakeStripe();
  await run({ currency: 'EUR', items: ELEVEN }, stripe);
  assert.deepEqual(stripe.calls.map((c) => c.path), ['/checkout/sessions']);
  assert.equal(stripe.calls[0].params.allow_promotion_codes, true);
  assert.equal(stripe.calls[0].params.cancel_url, 'https://telning.com/basket');
});

test('order emails: the discount has its own line, and the EU VAT still reads "included"', () => {
  const session = {
    id: 'cs_test_offer1234', currency: 'eur', amount_subtotal: 20000, amount_total: 16690, livemode: false,
    shipping_cost: { amount_total: 690 }, total_details: { amount_tax: 2782, amount_discount: 4000 },
    metadata: { offer: 'halloween', region: 'EU' }, customer_details: { email: 'a@example.com', name: 'Anna Berg' },
    line_items: { data: [{ quantity: 11, description: 'Cocoa Cat mug', amount_total: 16000, price: { product: { metadata: { sku: 'mug-cocoa-cat' } } } }] },
  };
  const o = orderFrom(session, catalog);
  o.subtotal = session.amount_subtotal;
  assert.equal(o.discount, 4000);
  assert.equal(o.offer, 'halloween');
  const d = orderData(o);
  assert.equal(d.discount, true);
  assert.equal(d.discount_label, 'Discount (20% for 11 or more items)');
  assert.equal(d.discount_amount, '−€40.00');
  assert.equal(d.vat_label, 'VAT (included)');
  const html = render('order-confirmation', d).html;
  assert.match(html, /Discount \(20% for 11 or more items\)/);
  assert.match(html, /−€40\.00/);
  const plain = orderData({ ...o, discount: 0, offer: '' });
  assert.equal(plain.discount, false);
  assert.doesNotMatch(render('order-confirmation', plain).html, /Discount/);
});

test('offers: the Christmas & New Year page: two winter Story Walls (two ages each), every-day tote bags and mugs, Christmas and New Year cards', () => {
  const o = offers.byKey.get('new-year');
  assert.equal(o.path, '/campaigns/new-year');
  assert.deepEqual(o.sections.map((s) => [s.type, s.products.length]), [['poster', 4], ['tote', 8], ['mug', 12], ['postcards', 4], ['cards', 4]]);
  assert.deepEqual(o.sections[0].products.map((p) => p.series), ['round-the-year', 'round-the-year', 'big-days', 'big-days']);
  assert.ok(o.sections[1].products.every((p) => p.occasion === 'everyday') && o.sections[2].products.every((p) => p.occasion === 'everyday'));
  assert.deepEqual(o.sections.slice(1, 3).map((s) => s.title), ['Tote bags for every day', 'Mugs for every day'], 'the every-day designs are named as every day, not as Christmas');
  assert.deepEqual([...new Set(o.sections.slice(3).flatMap((s) => s.products.map((p) => p.occasion)))].sort(), ['christmas', 'new-year']);
  assert.equal(offerOpen(o, Date.parse('2026-12-31T23:59:00+01:00')), true);
  assert.equal(offerOpen(o, Date.parse('2027-01-01T00:00:00+01:00')), false);
  const e = shopPages['/campaigns/new-year'];
  assert.equal(e.noindex, true);
  assert.equal(e.sitemap, false);
  assert.ok(e.title.length <= 60 && !e.title.includes('&'), 'the title fits (an & would count as &amp;)');
  assert.ok(e.description.length >= 140 && e.description.length <= 160);
});

test('offers: each page counts only its own items: a Halloween mug is refused on the New Year page', async () => {
  const ny = [{ sku: 'postcards-lantern-cat', qty: 4 }, { sku: 'cards-scarf-cat', qty: 4 }, { sku: 'mug-tea-cat', qty: 2 }, { sku: 'poster-round-the-year-3-5', qty: 1 }];
  const stripe = fakeStripe();
  const r = await run({ currency: 'EUR', items: ny, offer: 'new-year' }, stripe, Date.parse('2026-12-01T12:00:00+01:00'));
  assert.equal(r.status, 200);
  assert.deepEqual(stripe.calls.at(-1).params.discounts, [{ coupon: 'telning-offer-20' }]);
  assert.equal(stripe.calls.at(-1).params.cancel_url, 'https://telning.com/campaigns/new-year');
  const mixed = await run({ currency: 'EUR', items: [...ny, { sku: 'mug-cocoa-cat', qty: 1 }], offer: 'new-year' }, fakeStripe(), Date.parse('2026-12-01T12:00:00+01:00'));
  assert.equal(mixed.body.error, 'sku');
});

test('offers: /campaigns lists both offers; hidden too; the offer pages sit under it in the breadcrumbs', () => {
  const e = shopPages['/campaigns'];
  assert.equal(e.noindex, true);
  assert.equal(e.sitemap, false);
  assert.ok(e.title.length <= 60 && !e.title.includes('&'));
  assert.ok(e.description.length >= 140 && e.description.length <= 160);
  assert.deepEqual(offers.list.map((o) => o.key), ['halloween', 'new-year']);
  for (const o of offers.list) assert.equal(shopPages[o.path].parent, '/campaigns');
});
