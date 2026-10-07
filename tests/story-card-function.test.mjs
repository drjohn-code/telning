// api/story-card.js end to end with Web Request/FormData: a real PNG (sharp), a text file posing as a JPG, missing
// consent, the no-email-service case (503), the no-JS HTML answer, and one good submission with a stubbed Resend.
// Run: node --test tests/story-card-function.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';

process.env.STORY_CARD_INBOX = 'team@example.com';
delete process.env.RESEND_API_KEY;
const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('resend.com')) { sent.push(JSON.parse(init.body)); return new Response('{"id":"x"}', { status: 200 }); }
  return realFetch(url, init);
};
const { POST, GET } = await import('../api/story-card.js');
const png = await sharp({ create: { width: 300, height: 400, channels: 3, background: '#ffcc66' } }).png().toBuffer();
const base = { email: 'a@b.co', childName: 'Mia', childAge: '3', ending: '1', book: 'other', consentGuardian: 'yes', consentCard: 'yes' };
function req(fields, fileBuf, fileName, accept = 'application/json') {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [].concat(v)) fd.append(k, x);
  if (fileBuf) fd.append('photo', new Blob([fileBuf], { type: 'image/png' }), fileName);
  return new Request('http://localhost/api/story-card', { method: 'POST', body: fd, headers: { accept, 'x-forwarded-for': '198.51.100.7' } });
}

test('without an email service the form answers 503 notReady', async () => {
  const r = await POST(req(base, png, 'd.png'));
  assert.equal(r.status, 503); assert.equal((await r.json()).error, 'notReady');
});

test('a text file named .jpg is refused by content', async () => {
  process.env.RESEND_API_KEY = 'test';
  const r = await POST(req(base, Buffer.from('not an image'), 'd.jpg'));
  assert.equal(r.status, 400); assert.equal((await r.json()).error, 'photoType');
});

test('answers without the answers consent are refused', async () => {
  const r = await POST(req({ ...base, q_choice: 'because' }, png, 'd.png'));
  assert.equal(r.status, 400); assert.equal((await r.json()).error, 'c3');
});

test('a good submission sends one email with the re-encoded drawing attached', async () => {
  sent.length = 0;
  const r = await POST(req({ ...base, q_choice: 'because', consentAnswers: 'yes' }, png, 'd.png'));
  assert.equal(r.status, 200); assert.equal((await r.json()).ok, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to[0], 'team@example.com');
  assert.match(sent[0].subject, /Story card: Mia, 3/);
  assert.equal(sent[0].attachments[0].filename, 'drawing.jpg');
  const jpg = Buffer.from(sent[0].attachments[0].content, 'base64');
  const meta = await sharp(jpg).metadata();
  assert.equal(meta.format, 'jpeg'); assert.ok(!meta.exif, 'no EXIF in the re-encoded drawing');
});

test('without JS the form gets an HTML thank-you page; GET is not allowed', async () => {
  const r = await POST(req(base, png, 'd.png', 'text/html'));
  assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/html/);
  assert.match(await r.text(), /Pim has your drawing/);
  assert.equal((await GET()).status, 405);
});
