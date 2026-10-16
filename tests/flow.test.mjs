// The whole order flow with the outside services faked: browse → product → basket → checkout session (fake Stripe)
// → the webhook reads the session back → the order is written to the database (fake PostgREST over fetch) →
// the customer gets the branded confirmation email → the admin sees the rows. Run: node --test tests/flow.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { catalog } from '../server/catalog-data.js';
import { handleCheckout } from '../server/checkout.js';
import { handleWebhook } from '../server/orders.js';
import { recordOrder, logEmail } from '../server/supabase.js';
import { render } from '../server/emails.js';

// the books are hidden for now (BOOKS_HIDDEN, 15 Oct 2026); this order still has one, so the two print partners are covered
const withBooks = { ...catalog, bySku: new Map([...catalog.bySku].map(([k, p]) => [k, p.hidden ? { ...p, hidden: false } : p])) };

const SECRET = 'whsec_flow';
const sign = (raw) => { const t = Math.floor(Date.now() / 1000); return `t=${t},v1=${createHmac('sha256', SECRET).update(`${t}.${raw}`).digest('hex')}`; };

test('browse → basket → checkout → webhook → database → confirmation email → admin rows', async () => {
  // 1. the basket from the browser: a book, its Story Wall and two Story Walls of the older age
  const items = [{ sku: 'book-star-hoppers-3-5', qty: 1 }, { sku: 'poster-star-hoppers-3-5', qty: 1 }, { sku: 'poster-star-hoppers-5-7', qty: 2 }];
  for (const it of items) assert.ok(catalog.bySku.get(it.sku), it.sku);

  // 2. checkout: our server builds the Stripe session from server prices only
  let session;
  const stripe = async (method, path, params) => {
    if (method === 'POST' && path === '/checkout/sessions') {
      session = {
        id: 'cs_test_flow123456', url: 'https://checkout.stripe.com/c/pay/flow', livemode: false, currency: params.line_items[0].price_data.currency,
        amount_subtotal: params.line_items.reduce((a, l) => a + l.price_data.unit_amount * l.quantity, 0),
        amount_total: params.line_items.reduce((a, l) => a + l.price_data.unit_amount * l.quantity, 0) + params.shipping_options[0].shipping_rate_data.fixed_amount.amount,
        shipping_cost: { amount_total: params.shipping_options[0].shipping_rate_data.fixed_amount.amount }, total_details: { amount_tax: 0 },
        metadata: params.metadata, payment_intent: 'pi_flow',
        customer_details: { email: 'anna@example.com', name: 'Anna Berg', phone: '+46700000000' },
        collected_information: { shipping_details: { name: 'Anna Berg', address: { line1: 'Storgatan 1', postal_code: '753 20', city: 'Uppsala', country: 'SE' } } },
        line_items: { data: params.line_items.map((l) => ({ description: l.price_data.product_data.name, quantity: l.quantity, amount_total: l.price_data.unit_amount * l.quantity, price: { product: { metadata: l.price_data.product_data.metadata } } })) },
      };
      return { status: 200, json: { url: session.url } };
    }
    if (method === 'GET' && path.startsWith('/checkout/sessions/')) return { status: 200, json: session };
    throw new Error('unexpected stripe call ' + path);
  };
  const co = await handleCheckout({ body: { currency: 'EUR', items }, origin: 'https://telning.com' }, { catalog: withBooks, stripe, open: true, tax: true, terms: true });
  assert.equal(co.status, 200);
  assert.equal(session.amount_total, 1290 + 2890 + 2 * 2890 + 490 + 690 + 2 * 100);   // items + 2 parcels (+ 2 extra Story Walls)

  // 3. the database: a fake PostgREST behind fetch, remembering what the server writes
  const tables = {};
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = new URL(url); const table = u.pathname.split('/rest/v1/')[1];
    const body = init.body ? JSON.parse(init.body) : null;
    if (init.method === 'POST') { const rows = (Array.isArray(body) ? body : [body]).map((r, i) => ({ id: `${table}-${(tables[table] || []).length + i + 1}`, ...r })); tables[table] = [...(tables[table] || []), ...rows]; return new Response(JSON.stringify(rows), { status: 201, headers: { 'Content-Type': 'application/json' } }); }
    if (init.method === 'PATCH') { return new Response('[]', { status: 200 }); }
    return new Response('[]', { status: 200 });
  };
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  try {
    // 4. the webhook: signature, read back, write, email
    const sent = [];
    const raw = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: session.id, payment_status: 'paid' } } });
    const r = await handleWebhook({ raw, signature: sign(raw) }, {
      secret: SECRET, catalog, stripe, sendEmail: async (m) => sent.push(m), inbox: 'team@example.com', from: 'Telning <orders@example.com>', contact: 'info@example.com', partners: {},
      db: { recordOrder, logEmail }, render, log: () => {},
    });
    assert.equal(r.status, 200);
    // the admin rows
    assert.equal(tables.customers.length, 1);
    assert.equal(tables.orders.length, 1);
    assert.equal(tables.orders[0].email, 'anna@example.com');
    assert.equal(tables.orders[0].total_cents, session.amount_total);
    assert.equal(tables.order_items.length, 3);
    assert.deepEqual(tables.fulfilments.map((f) => f.partner).sort(), ['lulu', 'printful']);
    assert.equal(tables.email_log.length, 1);
    assert.equal(tables.email_log[0].template, 'order-confirmation');
    // the emails: the team sheet and the branded customer confirmation (HTML + text, no partner names)
    assert.equal(sent.length, 2);
    assert.equal(sent[1].to, 'anna@example.com');
    assert.match(sent[1].html, /Thank you, Anna/);
    assert.match(sent[1].html, /Star Hoppers Story Wall/);
    assert.doesNotMatch(sent[1].html + sent[1].text, /lulu|printful|gelato/i);
    assert.match(sent[0].text, /TEST ORDER/);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});
