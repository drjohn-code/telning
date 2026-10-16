// Marketing emails (server/campaigns.js), the unsubscribe link (server/unsubscribe.js) and the "Letters from Pim" box at
// checkout, with a fake database and a fake email service. Run: node --test tests/campaigns.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseList, textToHtml, cleanCampaign, recipients, handleCampaign } from '../server/campaigns.js';
import { unsubscribeUrl, emailFromLink, unsubscribeEmail } from '../server/unsubscribe.js';
import { render } from '../server/emails.js';
import { catalog } from '../server/catalog-data.js';
import { handleCheckout } from '../server/checkout.js';
import { orderFrom } from '../server/orders.js';

process.env.UNSUBSCRIBE_SECRET = 'test-secret';
const CAMPAIGN = { subject: 'Winter Story Walls', preheader: 'Three new walls', headline: 'Winter on the wall', text: 'Snow and a fox.\n\nOrder **before 10 December**: https://telning.com/books', image: 'https://example.supabase.co/storage/v1/object/public/email-images/w.jpg', imageAlt: 'A wall', ctaLabel: 'See them', ctaUrl: 'https://telning.com/books' };

function fakeDb({ subscribers = [], buyers = [], suppressed = [] } = {}) {
  const calls = { inserts: [], updates: [], selects: [] };
  const db = {
    select: async (table, q) => {
      calls.selects.push(`${table}?${q}`);
      const offset = Number((q.match(/offset=(\d+)/) || [])[1] || 0);
      const rows = table === 'newsletter_subscribers' ? subscribers : table === 'customers' ? buyers : table === 'email_suppressions' ? suppressed : [];
      return { ok: true, data: rows.slice(offset, offset + 1000).map((email) => ({ email })) };
    },
    insert: async (table, rows) => { calls.inserts.push({ table, rows }); return { ok: true, data: rows.map((r, i) => ({ id: `${table}-${i + 1}`, ...r })) }; },
    update: async (table, filter, patch) => { calls.updates.push({ table, filter, patch }); return { ok: true }; },
    upsert: async (table, rows) => { calls.inserts.push({ table, rows }); return { ok: true }; },
  };
  return { db, calls };
}

test('pasted lists: names, commas and new lines; duplicates and bad addresses are dropped', () => {
  const r = parseList('Anna <Anna@Example.com>, bo@example.se\nbo@example.se; not-an-email@ x@y\nlisa@example.co.uk.');
  assert.deepEqual(r.valid, ['anna@example.com', 'bo@example.se', 'lisa@example.co.uk']);
  assert.deepEqual(r.invalid, ['x@y']);
});

test('the text box becomes safe paragraphs with bold and links', () => {
  const h = textToHtml('Hello <script>x</script>\nline two\n\n**Bold** and https://telning.com/books.');
  assert.match(h, /^<p style="margin:0 0 14px">Hello &lt;script&gt;x&lt;\/script&gt;<br>line two<\/p>/);
  assert.match(h, /<strong>Bold<\/strong>/);
  assert.match(h, /<a href="https:\/\/telning\.com\/books"[^>]*>https:\/\/telning\.com\/books<\/a>\.<\/p>$/);
});

test('a campaign needs a subject, some text, https links, and a button label with its link', () => {
  assert.equal(cleanCampaign({ text: 'x' }).error, 'subject');
  assert.equal(cleanCampaign({ subject: 's' }).error, 'text');
  assert.equal(cleanCampaign({ subject: 's', text: 'x', image: 'http://x.se/a.jpg' }).error, 'image');
  assert.equal(cleanCampaign({ subject: 's', text: 'x', ctaLabel: 'Go' }).error, 'cta');
  assert.equal(cleanCampaign({ subject: 's', text: 'x', ctaLabel: 'Go', ctaUrl: 'javascript:alert(1)' }).error, 'ctaUrl');
  assert.equal(cleanCampaign(CAMPAIGN).ok, true);
});

test('recipients: newsletter + buyers + pasted, no doubles, unsubscribed skipped, pasted only when agreed', async () => {
  const { db } = fakeDb({ subscribers: ['a@x.se', 'b@x.se'], buyers: ['B@x.se', 'c@x.se'], suppressed: ['c@x.se'] });
  const r = await recipients({ sources: ['newsletter', 'buyers', 'pasted'], pasted: 'd@x.se, a@x.se', pastedAgreed: true }, db);
  assert.deepEqual(r.emails, ['a@x.se', 'b@x.se', 'd@x.se']);
  assert.deepEqual(r.counts, { newsletter: 2, buyers: 2, pasted: 2, invalid: 0, suppressed: 1, total: 3 });
  const no = await recipients({ sources: ['newsletter', 'pasted'], pasted: 'd@x.se' }, db);
  assert.equal(no.error, 'agreed');
  assert.deepEqual(no.emails, ['a@x.se', 'b@x.se'], 'the list is left out, the rest still counts');
  const refused = await handleCampaign({ action: 'send', campaign: CAMPAIGN, sources: ['newsletter', 'pasted'], pasted: 'd@x.se' }, { email: 'j@x.se' }, { db, render, sendBatch: async () => { throw new Error('must not send'); } });
  assert.equal(refused.body.error, 'agreed');
});

test('send: batches of 100, one unsubscribe link per person, headers, log and campaign row', async () => {
  const subscribers = Array.from({ length: 250 }, (_, i) => `p${String(i).padStart(3, '0')}@example.com`);
  const { db, calls } = fakeDb({ subscribers });
  const batches = []; let slept = 0;
  const deps = { db, render, from: 'Telning <letters@telning.com>', contact: 'info@telning.com', sleep: async () => { slept++; }, sendEmail: async () => 'x', sendBatch: async (m) => { batches.push(m); return m.map((_, i) => `em_${i}`); } };
  const r = await handleCampaign({ action: 'send', campaign: CAMPAIGN, sources: ['newsletter'] }, { email: 'john@telning.com' }, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.sent, 250);
  assert.deepEqual(batches.map((b) => b.length), [100, 100, 50]);
  assert.equal(slept, 2);
  const m = batches[0][0];
  assert.equal(m.to, 'p000@example.com');
  assert.equal(m.subject, 'Winter Story Walls');
  assert.equal(m.replyTo, 'info@telning.com');
  assert.equal(m.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  const link = unsubscribeUrl('p000@example.com');
  assert.equal(m.headers['List-Unsubscribe'], `<${link}>`);
  assert.ok(m.html.includes(link.replace(/&/g, '&amp;')), 'own unsubscribe link in the html');
  assert.ok(m.text.includes(link), 'own unsubscribe link in the text');
  assert.ok(!m.html.includes('__unsubscribe__') && !batches[1][5].html.includes(link.replace(/&/g, '&amp;')));
  assert.match(m.html, /email\/telning-logo-badge\.png/);
  assert.match(m.html, /email-images\/w\.jpg/);
  assert.match(m.html, /<strong>before 10 December<\/strong>/);
  assert.match(m.html, /See them/);
  assert.match(m.html, /WelloWork AB/);
  assert.equal(calls.inserts.filter((x) => x.table === 'email_log').reduce((a, x) => a + x.rows.length, 0), 250);
  assert.deepEqual(calls.updates.find((u) => u.table === 'campaigns').patch.sent, 250);
});

test('test send goes only to the admin; preview and count work; nobody to send to is refused', async () => {
  const { db } = fakeDb({ subscribers: ['a@x.se'] });
  const sent = [];
  const deps = { db, render, from: 'Telning <letters@telning.com>', contact: 'info@telning.com', sendEmail: async (m) => sent.push(m), sendBatch: async () => [] };
  const t = await handleCampaign({ action: 'test', campaign: CAMPAIGN }, { email: 'john@telning.com' }, deps);
  assert.equal(t.body.ok, true);
  assert.equal(sent[0].to, 'john@telning.com');
  assert.equal(sent[0].subject, '[Test] Winter Story Walls');
  const p = await handleCampaign({ action: 'preview', campaign: { subject: '' } }, { email: 'john@telning.com' }, deps);
  assert.match(p.body.html, /Unsubscribe/);
  const c = await handleCampaign({ action: 'count', sources: ['newsletter'] }, { email: 'john@telning.com' }, deps);
  assert.equal(c.body.counts.total, 1);
  const none = await handleCampaign({ action: 'send', campaign: CAMPAIGN, sources: [] }, { email: 'john@telning.com' }, deps);
  assert.equal(none.body.error, 'noRecipients');
});

test('unsubscribe link: round trip, a changed link fails, unsubscribing updates all three lists', async () => {
  const url = new URL(unsubscribeUrl('Anna@Example.com'));
  assert.equal(emailFromLink(url.searchParams.get('e'), url.searchParams.get('t')), 'anna@example.com');
  assert.equal(emailFromLink(Buffer.from('bo@example.com').toString('base64url'), url.searchParams.get('t')), '');
  const { db, calls } = fakeDb();
  assert.equal((await unsubscribeEmail('anna@example.com', { db })).ok, true);
  assert.equal(calls.inserts[0].table, 'email_suppressions');
  assert.deepEqual(calls.updates.map((u) => u.table), ['customers', 'newsletter_subscribers']);
  assert.equal(calls.updates[0].patch.marketing_consent, false);
});

test('checkout: the ticked box travels to Stripe and back into the order; unticked sends nothing', async () => {
  const seen = [];
  const stripe = async (method, path, params) => { seen.push(params); return { status: 200, json: { url: 'https://checkout.stripe.com/x' } }; };
  const items = [{ sku: 'mug-cocoa-cat', qty: 1 }];
  await handleCheckout({ body: { currency: 'EUR', items, marketing: true }, origin: 'https://telning.com' }, { catalog, stripe, open: true });
  await handleCheckout({ body: { currency: 'EUR', items }, origin: 'https://telning.com' }, { catalog, stripe, open: true });
  assert.equal(seen[0].metadata.marketing, 'yes');
  assert.equal(seen[1].metadata.marketing, undefined);
  assert.equal(orderFrom({ id: 'cs_test_1', currency: 'eur', metadata: { marketing: 'yes' }, line_items: { data: [] } }, catalog).marketing, true);
  assert.equal(orderFrom({ id: 'cs_test_2', currency: 'eur', metadata: {}, line_items: { data: [] } }, catalog).marketing, false);
});

test('a buyer who ticked the box is saved with marketing consent, and an old unsubscribe is lifted', async () => {
  const { recordOrder } = await import('../server/supabase.js');
  const seen = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    seen.push({ method: init.method, path: new URL(url).pathname.split('/rest/v1/')[1] + new URL(url).search, body: init.body ? JSON.parse(init.body) : null });
    const body = init.method === 'POST' ? JSON.stringify((JSON.parse(init.body) || []).map((r, i) => ({ id: `id-${i}`, ...r }))) : '[]';
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  try {
    const order = { id: 'cs_test_m1', number: 'T-M1', email: 'Anna@Example.com', name: 'Anna', address: { country: 'SE' }, currency: 'EUR', total: 100, items: [], parts: {}, marketing: true };
    await recordOrder(order);
    const cust = seen.find((s) => s.path.startsWith('customers'));
    assert.equal(cust.body[0].email, 'anna@example.com');
    assert.equal(cust.body[0].marketing_consent, true);
    assert.equal(cust.body[0].consent_source, 'checkout');
    assert.ok(seen.some((s) => s.method === 'DELETE' && s.path.startsWith('email_suppressions?email=eq.anna%40example.com')));
    seen.length = 0;
    await recordOrder({ ...order, id: 'cs_test_m2', number: 'T-M2', marketing: false });
    const c2 = seen.find((s) => s.path.startsWith('customers'));
    assert.equal('marketing_consent' in c2.body[0], false, 'no tick changes nothing');
    assert.ok(!seen.some((s) => s.method === 'DELETE'));
  } finally { globalThis.fetch = realFetch; delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
});
