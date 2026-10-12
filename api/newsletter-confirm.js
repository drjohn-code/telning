/* GET /api/newsletter-confirm?t=token — the double opt-in confirmation (needs SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY). */
import { confirm, page } from '../server/newsletter.js';
import { hasDb, upsert, select, update } from '../server/supabase.js';
import { hasKey, sendEmail } from '../server/resend.js';
import { render } from '../server/emails.js';
const FROM = process.env.STORY_CARD_FROM || 'Pim <pim@telning.com>';
export async function GET(request) {
  const t = new URL(request.url).searchParams.get('t');
  const h = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (!hasDb() || !hasKey()) return new Response(page('Not open yet', 'The newsletter list is not connected yet. Please try again later.'), { status: 503, headers: h });
  const r = await confirm(t, { db: { upsert, select, update }, sendEmail, render, from: FROM, log: (o) => console.log('newsletter', JSON.stringify(o)) });
  return new Response(r.ok ? page('Thank you!', 'Your email is confirmed. Pim writes a few times a year, when there is something new.') : page('This link did not work', 'The link is old or was already used. Sign up again at telning.com and we send a new one.'), { status: r.ok ? 200 : 400, headers: h });
}
