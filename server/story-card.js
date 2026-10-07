/* The "Send Pim your ending" handler (brief Part C). Pure logic, no framework: api/story-card.js wires it to Vercel.
   Data rules (brief 5.2), true in this code:
   - Part 2 answers are never written to a database, file, log, analytics or error tracker. They live in `input`
     for the length of one request, go into the one email to the team (manual mode) or the one AI request
     (auto mode), and are gone. Nothing here logs field values: only { ok, mode, ms }.
   - The drawing is re-encoded (sharp): EXIF and GPS are dropped; the file type is checked by content.
   - Spam: honeypot, a per-IP rate limit (best effort, per function instance).
   Modes (site data storyCard.mode):
   - manual: one email to the team inbox with the fields, the answers and the drawing. A person makes the card.
   - auto: the Claude API checks the photo (no people), writes Pim's two lines and the talk-next note, the output is
     checked (length, banned words, structure); the card image is not rendered on the server yet, so the result
     goes to the team inbox as a draft for a person to finish (fallback to manual, as the brief asks). */
import { hasBanned } from './banned.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_BYTES = 10 * 1024 * 1024;
const RATE = { max: 8, windowMs: 10 * 60 * 1000 };
const hits = new Map();   // ip → [timestamps]

export const FIXED_LAST_LINE = "These are general ideas, not advice about your child's health or development. If you are ever worried, talk to your child's doctor or health nurse.";

const Q_IDS = ['world', 'character', 'child', 'choice', 'life', 'else'];

function rateLimited(ip, now) {
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE.max;
}

/** Read the answers from the fields. Chips are arrays, free text is trimmed and cut at 300 characters. */
export function readAnswers(fields) {
  const get = (k) => fields[k];
  const list = (k) => { const v = get(k); return Array.isArray(v) ? v : v ? [v] : []; };
  const text = (k) => String(get(k) || '').trim().slice(0, 300);
  const a = {
    world: { text: text('q_world') },
    character: { chips: list('q_character_chip'), text: text('q_character') },
    child: { start: list('q_child_start'), end: list('q_child_end'), text: text('q_child') },
    choice: { text: text('q_choice') },
    life: { text: text('q_life') },
    else: { text: text('q_else') },
  };
  const filled = Q_IDS.some((id) => Object.values(a[id]).some((v) => (Array.isArray(v) ? v.length : v)));
  return { answers: a, filled };
}

export function validate(fields, file) {
  const email = String(fields.email || '').trim();
  const name = String(fields.childName || '').trim().slice(0, 40);
  const age = parseInt(fields.childAge, 10);
  const ending = String(fields.ending || '');
  if (!email) return 'email';
  if (!EMAIL_RE.test(email)) return 'emailInvalid';
  if (!name) return 'name';
  if (!(age >= 1 && age <= 10)) return 'age';
  if (!['1', '2', 'own'].includes(ending)) return 'ending';
  if (!file || !file.buffer || !file.buffer.length) return 'photo';
  if (file.buffer.length > MAX_BYTES) return 'photoSize';
  if (fields.consentGuardian !== 'yes') return 'c1';
  if (fields.consentCard !== 'yes') return 'c2';
  const { filled } = readAnswers(fields);
  if (filled && fields.consentAnswers !== 'yes') return 'c3';
  return '';
}

/** Words in a line (for Pim's 14-word rule). */
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/** Check the AI output against the rules of brief 5.5 before anything is sent. */
export function checkGenerated(g) {
  if (!g || !Array.isArray(g.lines) || g.lines.length !== 2) return 'lines';
  if (g.lines.some((l) => words(l) > 14 || !l.trim())) return 'lineLength';
  if (g.lines.some(hasBanned)) return 'lineBanned';
  if (g.concern === true) return '';                                 // no tips: the handler sends the short, kind note
  const n = g.note || {};
  if (!n.whatYourChildDid || words(n.whatYourChildDid) > 40) return 'note1';
  if (!Array.isArray(n.questions) || n.questions.length !== 3) return 'questions';
  if (!n.actIdea || !n.tip) return 'note';
  const all = [n.whatYourChildDid, ...n.questions, n.actIdea, n.tip].join(' ');
  if (hasBanned(all)) return 'noteBanned';
  if (/\b(normal|abnormal|diagnos|disorder|delay|score|percentile|behind|ahead of)\b/i.test(all)) return 'noteLabels';
  return '';
}

/** The system prompt for auto mode (brief 5.5 rules). The fixed last line is added by code, never by the model. */
export const SYSTEM_PROMPT = `You write for Telning Publishing House, a Swedish maker of wordless picture books for children aged 0 to 7.
A parent has sent a photo of their child's drawn ending to a story, the child's first name and age, and optional notes
about the talk they had. You write two things, in simple British English (short sentences, everyday words):

1. "lines": exactly two lines from Pim, the Telning character. Pim speaks in the first person, warm, playful, about
   choosing. Each line is 14 words or fewer. Pim never makes a claim and never gives advice about health.
2. "note": a talk-next note for the grown-up with:
   - "whatYourChildDid": one line about what the child did, specific to the drawing and the notes. No big praise.
   - "questions": three questions for next time: one for Talk (easy: who, what, where), one for Ask (a feeling or why),
     one for Decide ("What if…?"). Easy first, then harder. Matched to the child's age.
   - "actIdea": one small thing to try in real life.
   - "tip": one tip for the grown-up (for example: wait five seconds after a question).

Rules you never break: no labels, no diagnosis, no scores, no "normal" or "not normal", no comparing with other
children, no promises about results, no advice on health, sleep, medicine or behaviour problems. Never use the words
proven, boosts, builds, improves, develops, calming, therapy, anxiety, autism, ADHD.
If the notes show worry about safety, harm or health, do not write tips: return {"concern": true, "lines": [...]}
with two gentle lines from Pim only.

Answer with JSON only, no other text:
{"concern": false, "lines": ["…", "…"], "note": {"whatYourChildDid": "…", "questions": ["…", "…", "…"], "actIdea": "…", "tip": "…"}}`;

export function buildPrompt({ childName, childAge, ending, book, answers }) {
  const endingText = ending === 'own' ? 'drew their own ending' : `chose ending ${ending}`;
  const a = answers;
  const lines = [
    `Child: ${childName}, age ${childAge}. Book: ${book || 'not given'}. The child ${endingText}.`,
    a.world.text && `Place of the story, in the parent's words: ${a.world.text}`,
    (a.character.chips.length || a.character.text) && `How the child thought the main character felt: ${[...a.character.chips, a.character.text].filter(Boolean).join(', ')}`,
    (a.child.start.length || a.child.end.length || a.child.text) && `The child's own feelings: at the start ${a.child.start.join(', ') || '-'}; at the end ${a.child.end.join(', ') || '-'}. ${a.child.text}`,
    a.choice.text && `Why the child chose this ending: ${a.choice.text}`,
    a.life.text && `Real life: ${a.life.text}`,
    a.else.text && `Anything else: ${a.else.text}`,
    'The drawing is attached as an image.',
  ].filter(Boolean);
  return lines.join('\n');
}

/** The email to the team (manual mode, and the auto-mode draft). Plain text; the drawing is attached. */
export function teamEmail({ fields, answers, filled, generated, replyTime, keepDays }) {
  const name = String(fields.childName || '').trim().slice(0, 40);
  const age = parseInt(fields.childAge, 10);
  const ending = fields.ending === 'own' ? 'drew their own ending' : `ending ${fields.ending}`;
  const share = fields.consentShare === 'yes' ? 'YES (first name, age and drawing only)' : 'no';
  const list = (arr) => (arr && arr.length ? arr.join(', ') : '-');
  const a = answers;
  const parts = [
    `New story card to make. Reply to the parent within ${replyTime}.`,
    '',
    `Parent email: ${String(fields.email || '').trim()}`,
    `Child: ${name}, ${age}`,
    `Book: ${fields.book || 'other'}`,
    `Ending: ${ending}`,
    `May share the card on Instagram/TikTok: ${share}`,
    '',
    filled ? 'ANSWERS (use once to write the tips; delete this email after you reply, and within ' + keepDays + ' days in every case):' : 'The parent skipped part 2 (no answers).',
    filled ? `- Place of the story: ${a.world.text || '-'}` : '',
    filled ? `- Main character felt: ${list(a.character.chips)}${a.character.text ? ' / ' + a.character.text : ''}` : '',
    filled ? `- Child felt: start ${list(a.child.start)}; end ${list(a.child.end)}${a.child.text ? ' / ' + a.child.text : ''}` : '',
    filled ? `- Why this ending: ${a.choice.text || '-'}` : '',
    filled ? `- Real life: ${a.life.text || '-'}` : '',
    filled ? `- Anything else: ${a.else.text || '-'}` : '',
    '',
    'TO DO: make the card (drawing in the frame, "A TADA ending by ' + name + ', ' + age + '", two lines from Pim, lockup, @telning.pub #TADAstory, colour strip).',
    'Then the talk-next note under the card:',
    '1. One line about what the child did (no big praise).',
    '2. "Next time, try asking:" three questions: Talk (easy), Ask (feeling or why), Decide ("What if…?"). Easy first. For a ' + age + '-year-old.',
    '3. "Try it in real life:" one small Act idea.',
    '4. "A tip for you:" one tip for the grown-up.',
    '5. Fixed last line: ' + FIXED_LAST_LINE,
    'Rules: no labels, no diagnosis, no scores, no comparing, no claims, no advice on health, sleep, medicine or behaviour. If the answers show worry about safety, harm or health: no tips; send the card and a short, kind note pointing to their doctor or the local emergency number.',
    'Email to the parent: subject "Your story card from Pim"; the card attached and inline; the note; the line "We have deleted your answers."; a link to https://telning.com/guide. No tracking pixels.',
  ];
  if (generated) {
    parts.push('', 'AI DRAFT (checked against the rules; a person decides):');
    parts.push(`Pim's lines: 1) ${generated.lines[0]}  2) ${generated.lines[1]}`);
    if (generated.concern) parts.push('The AI flagged a concern in the answers: send the card and the short, kind note only.');
    else if (generated.note) {
      const n = generated.note;
      parts.push(`What your child did: ${n.whatYourChildDid}`, `Questions: ${n.questions.join(' | ')}`, `Act: ${n.actIdea}`, `Tip: ${n.tip}`);
    }
  }
  return { subject: `Story card: ${name}, ${age}`, text: parts.filter((l) => l !== '').join('\n') };
}

/**
 * Handle one submission.
 * input: { fields: Record<string,string|string[]>, file: { buffer: Buffer, name: string, type: string } | null, ip: string }
 * deps:  { mode: 'manual'|'auto', inbox: string, from: string, replyTime: string, keepDays: number,
 *          processImage(buffer) → Promise<{ buffer, type: 'image/jpeg' }> (checks the type by content, drops EXIF),
 *          sendEmail({ to, from, subject, text, attachments }) → Promise<void>,
 *          generate?(prompt, imageBase64) → Promise<object|null> (auto mode), checkPhoto?(imageBase64) → Promise<boolean person>,
 *          log(obj), now() }
 * Returns { status, body } where body is { ok: true } or { ok: false, error: <code> }.
 */
export async function handleStoryCard(input, deps) {
  const t0 = (deps.now || Date.now)();
  const fields = input.fields || {};
  const log = deps.log || (() => {});
  const done = (status, body, extra) => { log({ ok: !!body.ok, status, mode: deps.mode, ms: (deps.now || Date.now)() - t0, ...(extra || {}) }); return { status, body }; };

  if (fields.website) return done(200, { ok: true }, { honeypot: true });              // a bot filled the hidden field: pretend
  if (rateLimited(input.ip || '?', t0)) return done(429, { ok: false, error: 'failed' });
  const err = validate(fields, input.file);
  if (err) return done(400, { ok: false, error: err });
  if (!deps.inbox || !deps.sendEmail) return done(503, { ok: false, error: 'notReady' });

  let image;
  try { image = await deps.processImage(input.file.buffer); } catch (e) { return done(400, { ok: false, error: 'photoType' }); }
  const { answers, filled } = readAnswers(fields);

  let generated = null;
  if (deps.mode === 'auto' && deps.generate) {
    const b64 = image.buffer.toString('base64');
    try {
      if (deps.checkPhoto && (await deps.checkPhoto(b64))) return done(400, { ok: false, error: 'person' });
      const g = await deps.generate(buildPrompt({ childName: fields.childName, childAge: fields.childAge, ending: fields.ending, book: fields.book, answers }), b64);
      generated = g && !checkGenerated(g) ? g : null;             // a failed check → manual (no AI draft)
    } catch (e) { generated = null; }
  }

  const mail = teamEmail({ fields, answers, filled, generated, replyTime: deps.replyTime || '24 hours', keepDays: deps.keepDays || 30 });
  try {
    await deps.sendEmail({ to: deps.inbox, from: deps.from, replyTo: String(fields.email).trim(), subject: mail.subject, text: mail.text,
      attachments: [{ filename: 'drawing.jpg', content: image.buffer, type: image.type }] });
  } catch (e) { return done(502, { ok: false, error: 'failed' }); }
  return done(200, { ok: true }, { answers: filled ? 'used' : 'none', ai: generated ? 'draft' : 'no' });
}
