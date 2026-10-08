// The sign-up handler with a fake Resend: new contact, existing contact, a send-only key (falls back to an email to the
// team), no key (503), honeypot, bad address, segment found or created once, and no address in the logs.
// Run: node --test tests/subscribe.test.mjs
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleSubscribe, _resetCache } from '../server/subscribe.js';

function fakeResend({ segments = [], contact = 201, add = 201, restricted = false } = {}) {
  const calls = [];
  const api = async (method, path, body) => {
    calls.push({ method, path, body });
    if (restricted) return { status: 401, json: { name: 'restricted_api_key' } };
    if (method === 'GET' && path === '/segments') return { status: 200, json: { object: 'list', data: segments } };
    if (method === 'POST' && path === '/segments') return { status: 201, json: { object: 'segment', id: 'seg-new', name: body.name } };
    if (method === 'POST' && path === '/contacts') return { status: contact, json: contact < 300 ? { object: 'contact', id: 'c1' } : { name: 'validation_error' } };
    if (method === 'POST' && path.startsWith('/contacts/')) return { status: add, json: { id: 'seg' } };
    return { status: 404, json: null };
  };
  return { api, calls };
}
const base = (over = {}) => ({ inbox: 'info@example.com', from: 'Pim <pim@example.com>', sendEmail: async () => {}, log: () => {}, ...over });
beforeEach(() => _resetCache());

test('a new address becomes a contact in the list segment (segment created once)', async () => {
  const r = fakeResend();
  const a = await handleSubscribe({ fields: { form: 'guide', email: 'Ann@Example.com' }, ip: '1' }, base({ api: r.api }));
  assert.deepEqual(a, { status: 200, body: { ok: true } });
  const made = r.calls.find((c) => c.path === '/contacts');
  assert.equal(made.body.email, 'ann@example.com');
  assert.deepEqual(made.body.segments, [{ id: 'seg-new' }]);
  assert.equal(r.calls.find((c) => c.path === '/segments' && c.method === 'POST').body.name, 'TADA guide');
  await handleSubscribe({ fields: { form: 'guide', email: 'bo@example.com' }, ip: '2' }, base({ api: r.api }));
  assert.equal(r.calls.filter((c) => c.path === '/segments').length, 2, 'GET + POST once, then cached');
});

test('an existing contact is added to the segment by email', async () => {
  const r = fakeResend({ segments: [{ id: 'seg-news', name: 'Letters from Pim' }], contact: 409 });
  const a = await handleSubscribe({ fields: { form: 'news', email: 'cy@example.com' }, ip: '3' }, base({ api: r.api }));
  assert.equal(a.body.ok, true);
  assert.ok(r.calls.some((c) => c.path === '/contacts/cy%40example.com/segments/seg-news'));
});

test('a send-only key falls back to one email to the team', async () => {
  const sent = [];
  const r = fakeResend({ restricted: true });
  const a = await handleSubscribe({ fields: { form: 'teacher', email: 'di@example.com' }, ip: '4' }, base({ api: r.api, sendEmail: async (m) => sent.push(m) }));
  assert.equal(a.body.ok, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'info@example.com');
  assert.match(sent[0].subject, /Teacher pack/);
  assert.match(sent[0].text, /di@example\.com/);
});

test('if both Resend paths fail the visitor sees an error, not a fake thank-you', async () => {
  const r = fakeResend({ restricted: true });
  const a = await handleSubscribe({ fields: { email: 'ed@example.com' }, ip: '5' }, base({ api: r.api, sendEmail: async () => { throw new Error('x'); } }));
  assert.deepEqual(a, { status: 502, body: { ok: false, error: 'failed' } });
});

test('no key → 503; honeypot → pretend; bad address → 400; logs carry no address', async () => {
  const logs = [];
  const log = (o) => logs.push(JSON.stringify(o));
  assert.equal((await handleSubscribe({ fields: { email: 'fy@example.com' }, ip: '6' }, base({ api: null, log }))).status, 503);
  assert.deepEqual((await handleSubscribe({ fields: { email: 'x@example.com', website: 'spam' }, ip: '7' }, base({ api: null, log }))).body, { ok: true });
  assert.equal((await handleSubscribe({ fields: { email: 'not-an-email' }, ip: '8' }, base({ api: null, log }))).body.error, 'invalid');
  assert.equal((await handleSubscribe({ fields: { email: '' }, ip: '9' }, base({ api: null, log }))).body.error, 'empty');
  assert.ok(logs.every((l) => !/@example\.com/.test(l)), 'no addresses in logs');
});
