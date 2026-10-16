// Shipments from the admin (server/shipping.js) with a fake database and a fake email service: the parcel is saved,
// the order moves to "shipped" only when every parcel has left, the buyer gets the "shipped" email with the right
// tracking button, and bad input is refused. Run: node --test tests/shipping.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleShip } from '../server/shipping.js';
import { render } from '../server/emails.js';
import { trackingUrl, cleanNumber, CARRIERS } from '../server/carriers.js';

const ORDER = { id: 'o1', number: 'T-ABC12345', email: 'anna@example.com', name: 'Anna Berg', address: { line1: 'Storgatan 1', postal_code: '753 20', city: 'Uppsala', country: 'SE' }, status: 'paid' };
const P1 = '11111111-1111-4111-8111-111111111111', P2 = '22222222-2222-4222-8222-222222222222';

function setup({ parcels = [{ id: P1, status: 'manual' }], order = ORDER, failEmail = false } = {}) {
  const rows = parcels.map((p) => ({ order_id: order.id, items: [{ sku: 'poster-star-hoppers-3-5', qty: 1, name: 'Star Hoppers Story Wall' }], ...p }));
  const calls = { updates: [], sent: [], logged: [] };
  const db = {
    select: async (table, q) => {
      if (q.startsWith('id=eq.')) { const r = rows.find((x) => x.id === q.slice(6, 42)); return { ok: true, data: r ? [{ ...r, orders: { ...order } }] : [] }; }
      return { ok: true, data: rows.map(({ id, status }) => ({ id, status })) };
    },
    update: async (table, filter, patch) => {
      calls.updates.push({ table, filter, patch });
      if (table === 'fulfilments') Object.assign(rows.find((x) => filter === `id=eq.${x.id}`), patch);
      return { ok: true, status: 204, data: null };
    },
  };
  const deps = {
    db, render, from: 'Telning <orders@telning.com>', contact: 'info@telning.com', now: () => new Date('2026-10-16T12:00:00Z'),
    sendEmail: async (m) => { if (failEmail) throw new Error('email 500'); calls.sent.push(m); return 'em_1'; },
    logEmail: async (e) => calls.logged.push(e),
  };
  return { deps, calls, rows };
}

test('one parcel: saved as shipped, order shipped, buyer emailed with the PostNord button', async () => {
  const { deps, calls, rows } = setup();
  const r = await handleShip({ parcel: P1, carrier: 'postnord', number: ' 0034 0434 1610 ', notify: true }, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.emailed, true);
  assert.equal(r.body.orderStatus, 'shipped');
  assert.equal(rows[0].status, 'shipped');
  assert.equal(rows[0].tracking_number, '0034 0434 1610');
  assert.equal(rows[0].tracking_url, 'https://tracking.postnord.com/en/tracking?id=003404341610');
  assert.equal(rows[0].notified_at, '2026-10-16T12:00:00.000Z');
  assert.ok(calls.updates.some((u) => u.table === 'orders' && u.patch.status === 'shipped'));
  const m = calls.sent[0];
  assert.equal(m.to, 'anna@example.com');
  assert.equal(m.subject, 'Your Telning parcel is on its way (T-ABC12345)');
  assert.match(m.html, /href="https:\/\/tracking\.postnord\.com\/en\/tracking\?id=003404341610"[^>]*>[\s\S]*?Track with PostNord/);
  assert.match(m.html, /Your parcel is on its way, Anna\./);
  assert.match(m.html, /Star Hoppers Story Wall/);
  assert.match(m.html, /email\/products\/poster-star-hoppers-3-5\.jpg/);
  assert.match(m.html, /This parcel is your whole order\./);
  assert.match(m.text, /Storgatan 1/);
  assert.deepEqual(calls.logged.map((l) => [l.template, l.orderId, l.providerId]), [['order-shipped', 'o1', 'em_1']]);
});

test('two parcels: the first does not ship the order; the email says one more parcel is coming', async () => {
  const { deps, calls } = setup({ parcels: [{ id: P1, status: 'manual' }, { id: P2, status: 'manual' }] });
  const r = await handleShip({ parcel: P1, carrier: 'dhl', number: 'JD014600006281230704' }, deps);
  assert.equal(r.body.orderStatus, 'paid');
  assert.ok(!calls.updates.some((u) => u.table === 'orders'));
  assert.match(calls.sent[0].html, /comes in 1 more parcel/);
  const r2 = await handleShip({ parcel: P2, carrier: 'ups', number: '1Z999AA10123456784' }, deps);
  assert.equal(r2.body.orderStatus, 'shipped');
  assert.match(calls.sent[1].html, /This is the last parcel of your order\./);
});

test('a pasted link wins; "Other" uses its name; no email when the box is not ticked; resend sends again', async () => {
  const { deps, calls, rows } = setup();
  const r = await handleShip({ parcel: P1, carrier: 'other', carrierName: 'Budbee', number: 'BB123456', url: 'https://budbee.com/t/BB123456', notify: false }, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.emailed, false);
  assert.equal(calls.sent.length, 0);
  assert.equal(rows[0].tracking_url, 'https://budbee.com/t/BB123456');
  assert.equal(rows[0].carrier_name, 'Budbee');
  const again = await handleShip({ parcel: P1, action: 'resend' }, deps);
  assert.equal(again.body.emailed, true);
  assert.match(calls.sent[0].html, /Budbee/);
  assert.match(calls.sent[0].html, /Track your parcel/);
});

test('bad input is refused; a failed email is logged and reported, the parcel stays saved', async () => {
  const { deps } = setup();
  assert.equal((await handleShip({ parcel: 'x', carrier: 'dhl', number: '123456' }, deps)).body.error, 'parcel');
  assert.equal((await handleShip({ parcel: P1, carrier: 'pigeon', number: '123456' }, deps)).body.error, 'carrier');
  assert.equal((await handleShip({ parcel: P1, carrier: 'dhl', number: '<b>' }, deps)).body.error, 'number');
  assert.equal((await handleShip({ parcel: P1, carrier: 'dhl', number: '123456', url: 'javascript:alert(1)' }, deps)).body.error, 'url');
  assert.equal((await handleShip({ parcel: P1, action: 'resend' }, deps)).body.error, 'notShipped');
  assert.equal((await handleShip({ parcel: '33333333-3333-4333-8333-333333333333', carrier: 'dhl', number: '123456' }, deps)).status, 404);
  const f = setup({ failEmail: true });
  const r = await handleShip({ parcel: P1, carrier: 'gls', number: '12345678' }, f.deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.emailError, 'email');
  assert.equal(f.rows[0].status, 'shipped');
  assert.equal(f.calls.logged[0].status, 'failed');
});

test('carriers: every carrier builds an https link; numbers are cleaned', () => {
  for (const c of CARRIERS) assert.match(trackingUrl(c.key, 'AB 123 456'), /^https:\/\/[^\s]+AB123456/, c.key);
  assert.equal(cleanNumber('  ab-12  34 '), 'ab-12 34');
  assert.equal(cleanNumber('12'), '');
  assert.equal(trackingUrl('dhl', '123456', 'http://insecure.example'), '');
});

test('a link with & is written as &amp; in the email and comes back as & in the plain text', async () => {
  const { deps, calls } = setup();
  await handleShip({ parcel: P1, carrier: 'dhl', number: 'JD014600006281230704' }, deps);
  assert.match(calls.sent[0].html, /tracking-parcel\.html\?submit=1&amp;tracking-id=JD014600006281230704"/);
  assert.match(calls.sent[0].text, /tracking-parcel\.html\?submit=1&tracking-id=JD014600006281230704/);
});
