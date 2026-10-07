// Brief 5.2: prove that part-2 answers are not stored or logged. A unique token goes into the answers; after the
// request we search everything the handler could have written: console output, the repo's working tree (files
// changed or created), temp directories, and the dist/ output. The token may appear only in the one captured email.
// Run: node --test tests/privacy.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { handleStoryCard, checkGenerated, FIXED_LAST_LINE } from '../server/story-card.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TOKEN = 'ZXQ-' + Math.random().toString(36).slice(2, 10).toUpperCase() + '-PRIVACY';

function grepTree(dir, token, skip = ['node_modules', '.git', '.astro']) {
  const found = [];
  for (const f of readdirSync(dir)) {
    if (skip.includes(f)) continue;
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) found.push(...grepTree(p, token, skip));
    else if (st.size < 20 * 1024 * 1024) { try { if (readFileSync(p, 'latin1').includes(token)) found.push(p); } catch {} }
  }
  return found;
}

test('answers are used once and not stored or logged', async () => {
  const logs = [];
  const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  for (const k of Object.keys(orig)) console[k] = (...a) => logs.push(a.map(String).join(' '));
  const tmp = mkdtempSync(join(tmpdir(), 'telning-privacy-'));
  const emails = [];
  const fields = {
    form: 'story-card', email: 'parent@example.com', childName: 'Noa', childAge: '5', ending: '2', book: 'other',
    q_character_chip: ['happy', 'proud'], q_child_start: ['worried'], q_child_end: ['calm'],
    q_choice: `Because sharing felt better ${TOKEN}`, q_life: `Told me about the sandpit ${TOKEN}`,
    consentGuardian: 'yes', consentCard: 'yes', consentAnswers: 'yes',
  };
  const file = { buffer: Buffer.from('fake-image-bytes-' + TOKEN), name: 'drawing.jpg', type: 'image/jpeg' };
  const before = execSync('git status --porcelain', { cwd: ROOT }).toString();
  const res = await handleStoryCard({ fields, file, ip: '203.0.113.9' }, {
    mode: 'auto', inbox: 'team@example.com', from: 'Pim <pim@example.com>', replyTime: '24 hours', keepDays: 30,
    processImage: async (b) => ({ buffer: Buffer.from('processed'), type: 'image/jpeg' }),
    sendEmail: async (m) => { emails.push(m); },
    checkPhoto: async () => false,
    generate: async (prompt) => ({ concern: false, lines: ['You chose the ending where they share.', 'I would choose that one too!'],
      note: { whatYourChildDid: 'Your child drew the sandpit and chose sharing.', questions: ['Who is in the sandpit?', 'How did she feel when he shared?', 'What if nobody shared?'], actIdea: 'Share one toy at the park today.', tip: 'Count to five after a question.' } }),
    log: (o) => console.log('story-card', JSON.stringify(o)),
  });
  for (const k of Object.keys(orig)) console[k] = orig[k];

  assert.equal(res.status, 200); assert.equal(res.body.ok, true);
  assert.equal(emails.length, 1, 'exactly one email to the team');
  assert.ok(emails[0].text.includes(TOKEN), 'the answers are in the one email (by design, manual mode)');
  assert.ok(!logs.join('\n').includes(TOKEN), 'the token is not in any console output');
  assert.ok(logs.every((l) => !/parent@example|Noa/.test(l)), 'no field values in logs');
  const after = execSync('git status --porcelain', { cwd: ROOT }).toString();
  assert.equal(after, before, 'the handler changed no file in the working tree');
  assert.deepEqual(grepTree(ROOT, TOKEN), [], 'the token is in no file under the project (dist included)');
  assert.deepEqual(grepTree(tmp, TOKEN), [], 'nothing in the temp directory');
  rmSync(tmp, { recursive: true, force: true });
});

test('the output check rejects long lines, banned words and labels', () => {
  const good = { concern: false, lines: ['You chose the ending where they share.', 'I would choose that one too!'], note: { whatYourChildDid: 'x', questions: ['a', 'b', 'c'], actIdea: 'd', tip: 'e' } };
  assert.equal(checkGenerated(good), '');
  assert.equal(checkGenerated({ ...good, lines: ['one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen', 'ok'] }), 'lineLength');
  assert.equal(checkGenerated({ ...good, lines: ['This is proven to work.', 'ok'] }), 'lineBanned');
  assert.equal(checkGenerated({ ...good, note: { ...good.note, tip: 'This is normal for his age.' } }), 'noteLabels');
  assert.equal(checkGenerated({ ...good, note: { ...good.note, questions: ['a'] } }), 'questions');
  assert.equal(checkGenerated({ concern: true, lines: ['Thank you for the drawing.', 'I kept it safe.'] }), '');
  assert.ok(FIXED_LAST_LINE.includes('doctor or health nurse'));
});

test('validation: honeypot, consent for answers, required fields', async () => {
  const deps = { mode: 'manual', inbox: 'team@example.com', from: 'x', processImage: async () => ({ buffer: Buffer.from('p'), type: 'image/jpeg' }), sendEmail: async () => {}, log: () => {} };
  const base = { email: 'a@b.co', childName: 'Mia', childAge: '3', ending: '1', consentGuardian: 'yes', consentCard: 'yes' };
  const file = { buffer: Buffer.from('img'), name: 'd.jpg', type: 'image/jpeg' };
  assert.equal((await handleStoryCard({ fields: { ...base, website: 'spam' }, file, ip: '1' }, deps)).body.ok, true);   // pretends
  assert.equal((await handleStoryCard({ fields: { ...base, email: '' }, file, ip: '2' }, deps)).body.error, 'email');
  assert.equal((await handleStoryCard({ fields: { ...base, q_choice: 'because' }, file, ip: '3' }, deps)).body.error, 'c3');
  assert.equal((await handleStoryCard({ fields: base, file: null, ip: '4' }, deps)).body.error, 'photo');
  assert.equal((await handleStoryCard({ fields: base, file, ip: '5' }, { ...deps, inbox: '' })).status, 503);
  assert.equal((await handleStoryCard({ fields: base, file, ip: '6' }, deps)).body.ok, true);
});
