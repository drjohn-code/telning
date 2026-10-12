/* GET /api/newsletter-unsubscribe?t=token — one click, no login, no questions. */
import { unsubscribe, page } from '../server/newsletter.js';
import { hasDb, upsert, select, update } from '../server/supabase.js';
export async function GET(request) {
  const t = new URL(request.url).searchParams.get('t');
  const h = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (!hasDb()) return new Response(page('Not open yet', 'The newsletter list is not connected yet. Reply to any letter from Pim and we remove you by hand.'), { status: 503, headers: h });
  const r = await unsubscribe(t, { db: { upsert, select, update } });
  return new Response(r.ok ? page('You are unsubscribed', 'No more letters from Pim. Thank you for reading along.') : page('This link did not work', 'The link is old. Reply to any letter from Pim and we remove you by hand.'), { status: r.ok ? 200 : 400, headers: h });
}
export const POST = GET;
