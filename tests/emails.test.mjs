// The email templates: every template renders with sample data, has a subject, HTML and plain text, a preheader,
// the WelloWork AB footer, no partner names, no banned words; marketing emails carry an unsubscribe link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, TEMPLATE_NAMES, sampleFor, toText } from '../server/emails.js';

test('every template renders: subject, html, text, footer, no partner names, unsubscribe on marketing emails', () => {
  assert.ok(TEMPLATE_NAMES.length >= 16, `templates: ${TEMPLATE_NAMES.length}`);
  for (const n of TEMPLATE_NAMES) {
    const { subject, html, text, kind } = render(n, sampleFor(n));
    assert.ok(subject && !/\{\{(?!\s*\.)/.test(subject), `${n}: subject filled (${subject})`);
    assert.ok(html.includes('WelloWork AB'), `${n}: footer`);
    assert.ok(html.includes('width:600px') || html.includes('max-width:600px'), `${n}: 600 px`);
    assert.ok(text.length > 80, `${n}: plain text`);
    assert.doesNotMatch(html, /lulu|gelato|printful|printify|prodigi|giant poster|print on demand|\breward\b|\bprize\b|\bearn\b|eco-friendly|sustainable/i, `${n}: words`);
    const left = html.match(/\{\{(?!\s*\.)[^}]+\}\}/g) || [];
    assert.deepEqual(left, [], `${n}: unfilled placeholders ${left.join(' ')}`);
    if (kind === 'marketing') assert.match(html, /Unsubscribe/, `${n}: unsubscribe link`);
    // every picture has a real https address (a missing one renders as src="undefined" or src="")
    for (const [, src] of html.matchAll(/<img[^>]*\ssrc="([^"]*)"/g)) assert.match(src, /^https:\/\/[^\s]+\.(png|jpe?g|gif|webp)$|^\{\{|^https:\/\/telning\.com\/shop\//, `${n}: picture address "${src}"`);
    assert.match(html, /art\/pim-telning-portrait\.png/, `${n}: Pim in the footer`);
    assert.match(html, /alt="/, `${n}: alt text`);
  }
});

test('order emails use the order data: number, items, totals, address', () => {
  const order = { number: 'T-ABC12345', name: 'Anna Berg', email: 'a@example.com', currency: 'EUR', locale: 'en-IE', total: 4460, shipping: 1180, address: { line1: 'Storgatan 1', postal_code: '753 20', city: 'Uppsala', country: 'SE' }, items: [{ qty: 1, name: 'The Moon or the Stars?', amount: 1290 }, { qty: 1, name: 'Star Hoppers Story Wall', amount: 1990 }], parts: { lulu: [], printful: [] } };
  const r = render('order-confirmation', { order, contact: 'info@telning.com' });
  assert.equal(r.subject, 'Your Telning order T-ABC12345');
  assert.match(r.html, /Thank you, Anna/);
  assert.match(r.html, /Star Hoppers Story Wall/);
  assert.match(r.html, /€44\.60/);
  assert.match(r.text, /Storgatan 1/);
  assert.equal(toText('<p>Hi <a href="https://x.y">there</a></p>'), 'Hi there (https://x.y)');
});

test('order confirmation: product photo and line, order date, VAT included, receipt button only with a receipt', () => {
  const order = { number: 'T-ABC12345', name: 'Anna Berg', currency: 'EUR', locale: 'en-IE', created: 1792130400, subtotal: 3180, shipping: 1180, tax: 872, total: 4360, address: { country: 'SE' }, items: [{ sku: 'mug-cocoa-cat', qty: 2, name: 'Cocoa Cat mug', amount: 3180 }, { sku: 'no-such-sku', qty: 1, name: 'Old item', amount: 0 }], parts: { printful: [] } };
  const r = render('order-confirmation', { order, contact: 'info@telning.com' });
  assert.match(r.html, /src="https:\/\/telning\.com\/email\/products\/mug-cocoa-cat\.jpg"/);
  assert.match(r.html, /Ceramic mug · 330 ml<br>Qty 2/);
  assert.match(r.html, /16 October 2026/);
  assert.match(r.html, /VAT \(included\)/);
  assert.match(r.html, /You get an email with the tracking link when your parcel ships/);
  assert.doesNotMatch(r.html, /Receipt and invoice/);
  const withReceipt = render('order-confirmation', { order: { ...order, receipt: { url: 'https://invoice.stripe.com/i/x' } }, contact: 'info@telning.com' });
  assert.match(withReceipt.html, /href="https:\/\/invoice\.stripe\.com\/i\/x"[^>]*>[\s\S]*?Receipt and invoice/);
});

test('newsletter double opt-in: confirm sets the time and sends the welcome; unsubscribe needs a token', async () => {
  const { startOptIn, confirm, unsubscribe } = await import('../server/newsletter.js');
  const rows = new Map(); const sent = [];
  const db = {
    upsert: async (t, [r]) => { rows.set(r.email, { id: 'u1', ...rows.get(r.email), ...r }); return { ok: true, data: [rows.get(r.email)] }; },
    select: async (t, q) => { const tok = decodeURIComponent(q.split('confirm_token=eq.')[1].split('&')[0]); const r = [...rows.values()].find((x) => x.confirm_token === tok); return { ok: true, data: r ? [r] : [] }; },
    update: async (t, f, patch) => { const r = [...rows.values()][0]; Object.assign(r, patch); return { ok: true, data: [r] }; },
  };
  const deps = { db, sendEmail: async (m) => sent.push(m), render, from: 'Pim <pim@example.com>' };
  const r1 = await startOptIn('a@example.com', 'news', deps);
  assert.equal(r1.pending, true);
  assert.match(sent[0].subject, /confirm/i);
  const token = rows.get('a@example.com').confirm_token;
  assert.equal((await confirm('short', deps)).ok, false);
  assert.equal((await confirm(token, deps)).ok, true);
  assert.ok(rows.get('a@example.com').confirmed_at);
  assert.match(sent[1].subject, /Welcome/);
  assert.match(sent[1].html, /Unsubscribe/);
  assert.equal((await unsubscribe(token, deps)).ok, true);
});
