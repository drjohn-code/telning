/* Vercel Function (Node, Web Request/Response): POST /api/story-card — the "Send Pim your ending" form.
   Wires server/story-card.js to the real world: multipart or JSON body, sharp for the image, Resend for the email,
   the Claude API in auto mode. Environment: RESEND_API_KEY, STORY_CARD_INBOX (or site data storyCard.inbox),
   STORY_CARD_FROM (e.g. "Pim <pim@telning.com>"), ANTHROPIC_API_KEY (auto mode only).
   Logs carry no field values. The request body is never written anywhere. */
import sharp from 'sharp';
import { handleStoryCard, SYSTEM_PROMPT } from '../server/story-card.js';
import { hasKey, sendEmail } from '../server/resend.js';
import site from '../src/data/site-data.json' with { type: 'json' };

const sc = site.storyCard || {};
const INBOX = process.env.STORY_CARD_INBOX || sc.inbox || '';
const FROM = process.env.STORY_CARD_FROM || 'Telning <no-reply@telning.com>';
const MODE = process.env.STORY_CARD_MODE || sc.mode || 'manual';

async function processImage(buffer) {
  const meta = await sharp(buffer).metadata();                    // by content, not by extension
  if (!['jpeg', 'png', 'webp', 'heif'].includes(meta.format)) throw new Error('type');
  const out = await sharp(buffer).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  return { buffer: out, type: 'image/jpeg' };                      // sharp drops EXIF/GPS unless withMetadata() is called
}

/* Auto mode: the Claude API checks the photo for people and writes Pim's lines and the note (JSON). */
async function ai() {
  if (!process.env.ANTHROPIC_API_KEY) return {};
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();
  const call = (system, content, maxTokens) => client.beta.messages.create({
    model: 'claude-opus-5-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content }],
    output_config: { effort: 'medium' },
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
  });
  const textOf = (r) => (r.stop_reason === 'refusal' ? '' : r.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
  const json = (s) => { try { return JSON.parse(s.replace(/^[^{]*/, '').replace(/[^}]*$/, '')); } catch { return null; } };
  return {
    checkPhoto: async (b64) => {
      const r = await call('You check photos for a children\'s publisher. Answer with JSON only: {"person": true} if the image shows a real person, a face, or a photo of a child; {"person": false} if it shows only a drawing or an object.',
        [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: 'Does this photo show a person or a face?' }], 256);
      const j = json(textOf(r)); return !!(j && j.person);
    },
    generate: async (prompt, b64) => {
      const r = await call(SYSTEM_PROMPT, [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: prompt }], 2048);
      return json(textOf(r));
    },
  };
}

async function readBody(request) {
  const ct = request.headers.get('content-type') || '';
  const fields = {}; let file = null;
  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    const fd = await request.formData();
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'string') { if (k in fields) fields[k] = [].concat(fields[k], v); else fields[k] = v; }
      else if (k === 'photo' && v && v.size) file = { buffer: Buffer.from(await v.arrayBuffer()), name: v.name, type: v.type };
    }
  } else if (ct.includes('application/json')) {
    const j = await request.json();
    Object.assign(fields, j);
    if (j.photo && typeof j.photo === 'string') file = { buffer: Buffer.from(j.photo.replace(/^data:[^,]*,/, ''), 'base64'), name: 'drawing.jpg', type: 'image/jpeg' };
    delete fields.photo;
  }
  return { fields, file };
}

const thanksHtml = (ok, code) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${ok ? 'Pim has your drawing' : 'Something went wrong'} | Telning</title><style>body{margin:0;padding:48px 16px;background:#f6f1e8;color:#16140f;font:18px/1.6 "Instrument Sans",system-ui,sans-serif}main{max-width:640px;margin:auto;background:#fffdf8;border-radius:28px;padding:32px}h1{font-family:Fraunces,Georgia,serif;font-size:32px;margin:0 0 12px}a{color:#16140f;font-weight:600;text-decoration:underline;text-decoration-color:#ce4029}</style></head><body><main>${ok ? `<h1>Pim has your drawing!</h1><p>Look in your email within ${site.storyCardReplyTime}.</p>` : `<h1>Sorry, that did not work.</h1><p>Please go back and check the form (${code}).</p>`}<p><a href="/send">Back to the form</a> · <a href="/guide">The parent guide</a></p></main></body></html>`;

export async function POST(request) {
  const { fields, file } = await readBody(request);
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const extra = MODE === 'auto' ? await ai() : {};
  const result = await handleStoryCard({ fields, file, ip }, {
    mode: MODE, inbox: INBOX, from: FROM, replyTime: site.storyCardReplyTime, keepDays: sc.keepDays || 30,
    processImage, sendEmail: hasKey() ? sendEmail : null,   // no key → 503 notReady, nothing is lost silently
    ...extra, log: (o) => console.log('story-card', JSON.stringify(o)),
  });
  const wantsJson = (request.headers.get('accept') || '').includes('application/json') || (request.headers.get('content-type') || '').includes('application/json');
  if (wantsJson) return new Response(JSON.stringify(result.body), { status: result.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  return new Response(thanksHtml(result.body.ok, result.body.error || ''), { status: result.body.ok ? 200 : result.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}

export async function GET() {
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST', 'X-Robots-Tag': 'noindex' } });
}
