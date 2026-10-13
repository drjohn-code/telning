// The shop: catalogue, shipping, checkout session parameters (with a fake Stripe), the webhook signature and the
// order emails. Run: node --test tests/shop.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { catalog, shopPages } from '../server/catalog-data.js';
import { shippingFor, resolveLines, CURRENCIES, viewsOf } from '../server/catalog.js';
import { handleCheckout, sessionParams } from '../server/checkout.js';
import { handleWebhook, orderFrom, teamText, customerText } from '../server/orders.js';
import { verifySignature, formEncode } from '../server/stripe.js';

test('catalogue: 12 series × 4 + 20 Halloween gifts (8 tote bags in two colours, three photos each), every product priced', () => {
  assert.equal(catalog.products.filter((p) => p.category === 'books').length, 48);
  assert.equal(catalog.products.filter((p) => p.category === 'gifts').length, 20);
  assert.ok(catalog.products.filter((p) => p.category === 'gifts').every((p) => p.images.length === (p.soon ? 1 : 3)), 'a gift has its placeholder or its three photos');
  assert.equal(catalog.products.filter((p) => p.type === 'tote').length, 8);
  assert.deepEqual([...new Set(catalog.products.filter((p) => p.type === 'tote').map((p) => p.colour))].sort(), ['black', 'natural']);
  assert.equal(catalog.retired.length, 0, 'the older designs are gone (their URLs 301 in vercel.json)');
  for (const p of catalog.products) {
    const prices = p.variants ? p.variants.map((v) => v.price) : [p.price];
    for (const pr of prices) for (const c of CURRENCIES) assert.ok(Number.isInteger(pr[c]) && pr[c] > 0, `${p.sku} ${c}`);
    assert.ok(p.url.startsWith('/books/') || p.url.startsWith('/gifts/'));
    assert.ok(shopPages[p.url], `seo entry for ${p.url}`);
  }
  assert.equal(new Set(catalog.products.map((p) => p.sku)).size, catalog.products.length, 'skus are unique');
  assert.equal(catalog.bySku.get('book-star-hoppers-3-5').price.EUR, 1290);
  assert.equal(catalog.bySku.get('poster-star-hoppers-5-7').price.EUR, 1990);
});

const vercelRedirect = (src) => { const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')); return v.redirects.find((r) => r.source === src && r.permanent); };

test('postcards go to Europe and the UK only: checkout refuses them in US dollars and Canadian dollars', async () => {
  const pc = catalog.bySku.get('postcards-pumpkin-pup');
  assert.deepEqual(pc.regions, ['EU', 'UK']);
  const stripe = async () => ({ status: 200, json: { url: 'x' } });
  const { handleCheckout: hc } = await import('../server/checkout.js');
  const lines = [{ sku: 'book-star-hoppers-3-5', qty: 1 }];
  const ok = await hc({ body: { currency: 'USD', items: lines }, origin: 'x' }, { catalog, stripe, open: true });
  assert.equal(ok.status, 200);
  const soon = { ...pc, soon: false };   // as if the pictures were ready
  const cat2 = { ...catalog, bySku: new Map([...catalog.bySku, [pc.sku, soon]]) };
  for (const currency of ['USD', 'CAD']) {
    const r = await hc({ body: { currency, items: [{ sku: pc.sku, qty: 1 }] }, origin: 'x' }, { catalog: cat2, stripe, open: true });
    assert.equal(r.body.error, 'region', currency);
  }
  for (const currency of ['EUR', 'GBP']) assert.equal((await hc({ body: { currency, items: [{ sku: pc.sku, qty: 1 }] }, origin: 'x' }, { catalog: cat2, stripe, open: true })).status, 200, currency);
});

test('names and links: Story Wall, no partner names in customer-facing text, 301 for the old poster URLs', async () => {
  const wall = catalog.bySku.get('poster-star-hoppers-3-5');
  assert.equal(wall.name, 'Star Hoppers Story Wall');
  assert.equal(wall.url, '/books/star-hoppers/story-wall-3-5');
  assert.equal(wall.oldUrl, '/books/star-hoppers/giant-poster-3-5');
  assert.equal(catalog.bySku.get('mug-cocoa-cat').name, 'Cocoa Cat mug');
  assert.ok(vercelRedirect('/gifts/mugs/the-moon'), 'old gift URLs 301 to their category');
  const { readFileSync } = await import('node:fs');
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.ok(vercel.redirects.some((r) => r.source === '/books/:series/giant-poster-:age' && r.permanent));
  const shopJson = readFileSync(new URL('../src/data/shop.json', import.meta.url), 'utf8');
  const customerText = JSON.stringify({ ...JSON.parse(shopJson), parcels: undefined, types: Object.fromEntries(Object.entries(JSON.parse(shopJson).types).map(([k, v]) => [k, { ...v, partner: undefined }])), partnerRefs: undefined });
  assert.doesNotMatch(customerText, /lulu|gelato|printful|printify|prodigi|giant poster|print on demand|France, the UK/i);
  for (const p of catalog.products) {
    const page = shopPages[p.url];
    assert.ok(page.title.length <= 60, `${p.url} title ${page.title.length}`);
    assert.doesNotMatch(`${page.title} ${page.description} ${p.name}`, /lulu|gelato|printful|giant poster/i);
    assert.equal(p.images.length, p.soon ? 1 : viewsOf(p).length, `${p.sku} has all its photos`);
    assert.ok(!p.images.some((im) => /lulu|gelato|printful|mockup/i.test(im.src)));
  }
});

test('shipping: one fee per parcel, plus the extra-item fee', () => {
  const book = catalog.bySku.get('book-home-hearts-3-5');
  const poster = catalog.bySku.get('poster-home-hearts-3-5');
  const s = shippingFor(catalog.shop, [{ product: book, qty: 2 }, { product: poster, qty: 1 }], 'EUR');
  assert.equal(s.parcels.length, 2);
  assert.equal(s.total, 490 + 100 + 690);
});

test('resolveLines refuses unknown skus, bad quantities and missing variants', () => {
  assert.throws(() => resolveLines(catalog, [{ sku: 'nope', qty: 1 }]));
  assert.throws(() => resolveLines(catalog, [{ sku: 'book-home-hearts-3-5', qty: 0 }]));
  const withSoon = { ...catalog, bySku: new Map([...catalog.bySku, ['mug-x-soon', { ...catalog.bySku.get('mug-cocoa-cat'), sku: 'mug-x-soon', soon: true }]]) };
  assert.throws(() => resolveLines(withSoon, [{ sku: 'mug-x-soon', qty: 1 }]));      // coming soon: not for sale
  assert.throws(() => resolveLines(catalog, [{ sku: 'mug-the-moon', qty: 1 }]));       // removed design
  assert.equal(resolveLines(catalog, [{ sku: 'book-home-hearts-3-5', qty: 2 }])[0].qty, 2);
});

test('checkout: prices come from the server; region follows the currency; no key → notReady', async () => {
  const calls = [];
  const stripe = async (method, path, params) => { calls.push({ method, path, params }); return { status: 200, json: { url: 'https://checkout.stripe.com/c/pay/x' } }; };
  const body = { currency: 'GBP', items: [{ sku: 'poster-star-hoppers-3-5', qty: 1, price: 1 }, { sku: 'book-star-hoppers-5-7', qty: 1 }] };
  const r = await handleCheckout({ body, origin: 'https://telning.com' }, { catalog, stripe, open: true });
  assert.equal(r.status, 200);
  const p = calls[0].params;
  assert.equal(p.line_items[0].price_data.unit_amount, 1790);
  assert.equal(p.line_items[0].price_data.currency, 'gbp');
  assert.deepEqual(p.shipping_address_collection.allowed_countries, ['GB']);
  assert.equal(p.shipping_options[0].shipping_rate_data.fixed_amount.amount, 590 + 390);
  assert.match(p.success_url, /^https:\/\/telning\.com\/order\/thanks\?session_id=\{CHECKOUT_SESSION_ID\}$/);
  const enc = formEncode(p).toString();
  assert.match(enc, /line_items%5B0%5D%5Bprice_data%5D%5Bproduct_data%5D%5Bmetadata%5D%5Bsku%5D=poster-star-hoppers-3-5/);
  const none = await handleCheckout({ body, origin: 'x' }, { catalog, stripe: null, open: true });
  assert.equal(none.body.error, 'notReady');
  const closed = await handleCheckout({ body, origin: 'x' }, { catalog, stripe, open: false });
  assert.equal(closed.status, 503);
});

test('checkout: EUR delivers to the EU only, with VAT-inclusive prices when Stripe Tax is on', () => {
  const lines = resolveLines(catalog, [{ sku: 'poster-big-days-3-5', qty: 1 }]);
  const p = sessionParams(catalog, lines, 'EUR', { origin: 'https://telning.com', tax: true });
  assert.ok(p.shipping_address_collection.allowed_countries.includes('SE'));
  assert.ok(!p.shipping_address_collection.allowed_countries.includes('GB'));
  assert.equal(p.line_items[0].price_data.tax_behavior, 'inclusive');
  assert.equal(p.automatic_tax.enabled, true);
});

const SECRET = 'whsec_test';
const sign = (raw, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', SECRET).update(`${t}.${raw}`).digest('hex')}`;

test('webhook signature: good, wrong secret, too old', () => {
  const raw = '{"a":1}';
  assert.ok(verifySignature(raw, sign(raw), SECRET));
  assert.ok(!verifySignature(raw, sign(raw), 'whsec_other'));
  assert.ok(!verifySignature(raw, sign(raw, Math.floor(Date.now() / 1000) - 3600), SECRET));
  assert.ok(!verifySignature(raw + ' ', sign(raw), SECRET));
});

const SESSION = {
  id: 'cs_test_a1b2c3d4e5f6g7h8', livemode: false, currency: 'eur', amount_total: 4370,
  shipping_cost: { amount_total: 1280 }, total_details: { amount_tax: 0 }, metadata: { region: 'EU' },
  customer_details: { email: 'anna@example.com', name: 'Anna Berg', phone: '+46700000000' },
  collected_information: { shipping_details: { name: 'Anna Berg', address: { line1: 'Storgatan 1', postal_code: '753 20', city: 'Uppsala', country: 'SE' } } },
  line_items: { data: [
    { description: 'Star Hoppers colouring book, ages 3–5', quantity: 1, amount_total: 1290, price: { product: { metadata: { sku: 'book-star-hoppers-3-5', variant: '' } } } },
    { description: 'Star Hoppers giant colouring poster, ages 3–5', quantity: 1, amount_total: 1990, price: { product: { metadata: { sku: 'poster-star-hoppers-3-5', variant: '' } } } },
  ] },
};

test('order: split by printer, team sheet has the address and print files, customer email has no print details', () => {
  const o = orderFrom(SESSION, catalog);
  assert.deepEqual(Object.keys(o.parts).sort(), ['lulu', 'printful']);
  const team = teamText(o);
  assert.match(team, /TEST ORDER/);
  assert.match(team, /Storgatan 1/);
  assert.match(team, /art\/print\/story-walls\/star-hoppers-3-5\.svg/);
  const cust = customerText(o, { contact: 'info@telning.com' });
  assert.match(cust, /2 parcels/);
  assert.doesNotMatch(cust, /art\/print/);
});

test('webhook: paid session → team and customer emails; unpaid → ignored; bad signature → 400', async () => {
  const sent = [];
  const deps = { secret: SECRET, catalog, stripe: async () => ({ status: 200, json: SESSION }), sendEmail: async (m) => { sent.push(m); }, inbox: 'team@example.com', from: 'Telning <o@example.com>', contact: 'info@example.com', log: () => {} };
  const raw = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: SESSION.id, payment_status: 'paid' } } });
  const r = await handleWebhook({ raw, signature: sign(raw) }, deps);
  assert.equal(r.status, 200);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].to, 'team@example.com');
  assert.equal(sent[1].to, 'anna@example.com');
  const unpaid = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'x', payment_status: 'unpaid' } } });
  assert.equal((await handleWebhook({ raw: unpaid, signature: sign(unpaid) }, deps)).body.ignored, true);
  assert.equal((await handleWebhook({ raw, signature: 't=1,v1=00' }, deps)).status, 400);
  assert.equal((await handleWebhook({ raw, signature: sign(raw) }, { ...deps, secret: '' })).status, 503);
});

test('packs: choice checked (no age step), contents split over the titles, shipping per parcel, order split by partner', async () => {
  const { packChoice, packContents } = await import('../server/catalog.js');
  const pack = catalog.bySku.get('pack-classroom');
  assert.equal(packChoice(catalog, pack, 'book-star-hoppers-3-5,book-home-hearts-5-7|moon-cat~natural'), 'book-star-hoppers-3-5,book-home-hearts-5-7|moon-cat~natural');
  assert.equal(packChoice(catalog, pack, 'book-star-hoppers-3-5|ghost-pup~black'), 'book-star-hoppers-3-5|ghost-pup~black', 'a black-only tote in black');
  assert.equal(packChoice(catalog, pack, 'book-star-hoppers-3-5|ghost-pup~natural'), null, 'a black-only tote is never undyed');
  assert.equal(packChoice(catalog, pack, 'book-star-hoppers-3-5|library-day~natural'), null, 'a removed design is refused');
  assert.equal(packChoice(catalog, pack, 'book-a-3-5,book-b-3-5,book-c-3-5,book-d-3-5|moon-cat~natural'), null);
  assert.equal(packChoice(catalog, pack, 'book-star-hoppers-1-3|moon-cat~natural'), null);
  assert.equal(packChoice(catalog, pack, '3-5|star-hoppers|moon-cat~natural'), null, 'the old format with an age step is refused');
  assert.equal(packChoice(catalog, pack, 'poster-star-hoppers-3-5|moon-cat~natural'), null, 'only books are titles');
  const c = packContents(catalog, pack, 'book-star-hoppers-5-7,book-home-hearts-3-5|ghost-pup~black');
  assert.equal(c.filter((x) => x.sku.startsWith('book-')).reduce((a, x) => a + x.qty, 0), 30);
  assert.equal(c.filter((x) => x.sku.startsWith('poster-')).reduce((a, x) => a + x.qty, 0), 3);
  const lines = resolveLines(catalog, [{ sku: 'pack-circle', variant: 'book-paws-claws-3-5|moon-cat~natural', qty: 1 }]);
  const ship = shippingFor(catalog.shop, lines, 'EUR');
  assert.equal(ship.parcels.length, 3);
  const o = orderFrom({ ...SESSION, line_items: { data: [{ description: 'Story Circle pack', quantity: 1, amount_total: 15600, price: { product: { metadata: { sku: 'pack-circle', variant: 'book-paws-claws-3-5|moon-cat~natural' } } } }] } }, catalog);
  assert.deepEqual(Object.keys(o.parts).sort(), ['lulu', 'printful']);
  assert.equal(o.parts.lulu[0].qty, 10);
});

test('quote form: needs organisation, wish and a good email; honeypot; emails the team', async () => {
  const { handleQuote, _reset } = await import('../server/quote.js');
  _reset();
  const sent = [];
  const deps = { sendEmail: async (m) => sent.push(m), inbox: 'team@example.com', from: 'T <t@example.com>' };
  assert.equal((await handleQuote({ fields: { organisation: 'Lilla förskolan', wish: '120 books', email: 'bad' } }, deps)).body.error, 'email');
  assert.equal((await handleQuote({ fields: { organisation: '', wish: 'x', email: 'a@b.se' } }, deps)).body.error, 'missing');
  assert.equal((await handleQuote({ fields: { website: 'spam', organisation: 'x', wish: 'x', email: 'a@b.se' } }, deps)).body.ok, true);
  assert.equal(sent.length, 0);
  const r = await handleQuote({ fields: { organisation: 'Lilla förskolan', country: 'Sweden', children: '120', wish: '120 books, ages 3–5', email: 'Rektor@Example.se', invoice: 'on' } }, deps);
  assert.equal(r.status, 200);
  assert.equal(sent[0].to, 'team@example.com');
  assert.equal(sent[0].replyTo, 'rektor@example.se');
  assert.match(sent[0].text, /Pay by invoice: yes/);
});
