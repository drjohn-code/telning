/* Vercel Function: POST /api/subscribe — the email sign-up forms (Letters from Pim, TADA guide, teacher pack).
   JSON from the page script, or a plain form post without JS (then it answers with a small HTML page).
   Environment: RESEND_API_KEY (Full access, to keep contacts), STORY_CARD_INBOX and STORY_CARD_FROM (used for the
   fallback email). Logs carry no addresses. */
import { handleSubscribe } from '../server/subscribe.js';
import { hasKey, resendApi, sendEmail } from '../server/resend.js';
import site from '../src/data/site-data.json' with { type: 'json' };

const INBOX = process.env.STORY_CARD_INBOX || site.storyCard?.inbox || site.contactEmail || '';
const FROM = process.env.STORY_CARD_FROM || 'Telning <no-reply@telning.com>';

async function readFields(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) { try { return await request.json(); } catch { return {}; } }
  if (ct.includes('form')) { const fd = await request.formData(); return Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string')); }
  return {};
}

const page = (ok) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${ok ? 'Thank you' : 'Something went wrong'} | Telning</title><style>body{margin:0;padding:48px 16px;background:#f6f1e8;color:#16140f;font:18px/1.6 "Instrument Sans",system-ui,sans-serif}main{max-width:640px;margin:auto;background:#fffdf8;border-radius:28px;padding:32px}h1{font-family:Fraunces,Georgia,serif;font-size:32px;margin:0 0 12px}a{color:#16140f;font-weight:600;text-decoration:underline;text-decoration-color:#ce4029}</style></head><body><main>${ok ? '<h1>Thank you!</h1><p>Pim will write soon.</p>' : '<h1>Sorry, that did not work.</h1><p>Please go back and check your email address.</p>'}<p><a href="/">Back to Telning</a></p></main></body></html>`;

export async function POST(request) {
  const fields = await readFields(request);
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const result = await handleSubscribe({ fields, ip }, {
    api: hasKey() ? resendApi : null, sendEmail, inbox: INBOX, from: FROM,
    log: (o) => console.log('subscribe', JSON.stringify(o)),
  });
  const json = (request.headers.get('content-type') || '').includes('application/json') || (request.headers.get('accept') || '').includes('application/json');
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (json) return new Response(JSON.stringify(result.body), { status: result.status, headers: { ...headers, 'Content-Type': 'application/json' } });
  return new Response(page(result.body.ok), { status: result.body.ok ? 200 : result.status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET() {
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST', 'X-Robots-Tag': 'noindex' } });
}
