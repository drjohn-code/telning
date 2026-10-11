/* Vercel Function (Node, Web Request/Response): POST /api/quote — the quote form on /organisations.
   JSON or a plain form post. Environment: RESEND_API_KEY, ORDER_INBOX (falls back to STORY_CARD_INBOX, then site
   data contactEmail), ORDER_FROM (falls back to STORY_CARD_FROM). */
import { handleQuote } from '../server/quote.js';
import { hasKey, sendEmail } from '../server/resend.js';
import site from '../src/data/site-data.json' with { type: 'json' };

export async function POST(request) {
  const ct = request.headers.get('content-type') || '';
  let fields = {};
  try { fields = ct.includes('application/json') ? await request.json() : Object.fromEntries((await request.formData()).entries()); } catch { fields = {}; }
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const result = await handleQuote({ fields, ip }, {
    sendEmail: hasKey() ? sendEmail : null,
    inbox: process.env.ORDER_INBOX || process.env.STORY_CARD_INBOX || site.contactEmail,
    from: process.env.ORDER_FROM || process.env.STORY_CARD_FROM || 'Telning <no-reply@telning.com>',
    log: (o) => console.log('quote', JSON.stringify(o)),
  });
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (ct.includes('application/json')) return new Response(JSON.stringify(result.body), { status: result.status, headers: { ...headers, 'Content-Type': 'application/json' } });
  return new Response(null, { status: 303, headers: { ...headers, Location: `/organisations?quote=${result.body.ok ? 'sent' : result.body.error}#quote` } });
}
