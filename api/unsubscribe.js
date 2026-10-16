/* GET or POST /api/unsubscribe?e=…&t=… — the unsubscribe link in every marketing email (server/unsubscribe.js).
   GET shows a short page; POST is the one-click unsubscribe that Gmail and Apple Mail send (List-Unsubscribe-Post).
   No login, no questions. Environment: SUPABASE_SERVICE_ROLE_KEY (and optional UNSUBSCRIBE_SECRET). */
import { emailFromLink, unsubscribeEmail } from '../server/unsubscribe.js';
import { page } from '../server/newsletter.js';
import { hasDb, upsert, update } from '../server/supabase.js';

const h = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

export async function GET(request) {
  const u = new URL(request.url);
  const email = emailFromLink(u.searchParams.get('e'), u.searchParams.get('t'));
  if (!email) return new Response(page('This link did not work', 'The link is incomplete or old. Reply to any email from us and we remove you by hand.'), { status: 400, headers: h });
  if (!hasDb()) return new Response(page('Not open yet', 'The list is not connected yet. Reply to any email from us and we remove you by hand.'), { status: 503, headers: h });
  const r = await unsubscribeEmail(email, { db: { upsert, update } }, request.method === 'POST' ? 'one-click' : 'link');
  console.log('unsubscribe', JSON.stringify({ ok: r.ok, oneClick: request.method === 'POST' }));
  return new Response(r.ok ? page('You are unsubscribed', 'We will not send you marketing emails any more. Emails about your own orders still come. Thank you for reading along.') : page('Something went wrong', 'Please try the link again in a minute, or reply to any email from us and we remove you by hand.'), { status: r.ok ? 200 : 500, headers: h });
}
export const POST = GET;
