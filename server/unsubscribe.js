/* One-click unsubscribe for every marketing email, whoever it went to (newsletter sign-up, buyer who ticked the box
   at checkout, or a pasted list): the link carries the address and a signature, so nobody can unsubscribe someone else.
   Unsubscribing puts the address on email_suppressions (never emailed by a campaign again), turns off the buyer's
   marketing consent and ends a newsletter sign-up. Secret: UNSUBSCRIBE_SECRET, or one derived from the service role key.
   api/unsubscribe.js wires it. Logs carry no addresses. */
import { createHmac, timingSafeEqual } from 'node:crypto';

const HOST = 'https://telning.com';
const secret = () => process.env.UNSUBSCRIBE_SECRET || createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'no-key').update('telning-unsubscribe').digest('hex');
const sign = (email) => createHmac('sha256', secret()).update(email).digest('base64url').slice(0, 32);
const norm = (email) => String(email || '').trim().toLowerCase();

/** The unsubscribe link for one address. */
export function unsubscribeUrl(email) {
  const e = norm(email);
  return `${HOST}/api/unsubscribe?e=${Buffer.from(e).toString('base64url')}&t=${sign(e)}`;
}

/** The address in a link, or '' when the link was changed. */
export function emailFromLink(e, t) {
  let email = '';
  try { email = norm(Buffer.from(String(e || ''), 'base64url').toString('utf8')); } catch { return ''; }
  if (!email.includes('@') || !t) return '';
  const a = Buffer.from(sign(email)), b = Buffer.from(String(t));
  return a.length === b.length && timingSafeEqual(a, b) ? email : '';
}

/** deps: { db: { upsert, update } } → { ok } */
export async function unsubscribeEmail(email, deps, source = 'link') {
  const e = encodeURIComponent(email);
  const s = await deps.db.upsert('email_suppressions', [{ email, reason: 'unsubscribed', source }], 'email', { prefer: 'resolution=merge-duplicates,return=minimal' });
  await deps.db.update('customers', `email=eq.${e}`, { marketing_consent: false }, { prefer: 'return=minimal' });
  await deps.db.update('newsletter_subscribers', `email=eq.${e}&unsubscribed_at=is.null`, { unsubscribed_at: new Date().toISOString() }, { prefer: 'return=minimal' });
  return { ok: !!s.ok };
}
