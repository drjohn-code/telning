/* Newsletter double opt-in (when the database is connected): a sign-up writes a row with a token and gets the
   "please confirm" email; the confirm link sets confirmed_at and sends the welcome email; the unsubscribe link sets
   unsubscribed_at. Without the database the sign-up keeps going to Resend (server/subscribe.js). Logs carry no addresses. */
import { randomBytes } from 'node:crypto';

const HOST = 'https://telning.com';
/** deps: { db: { upsert, select, update }, sendEmail, render, from, log } */
export async function startOptIn(email, list, deps) {
  const token = randomBytes(24).toString('base64url');
  const r = await deps.db.upsert('newsletter_subscribers', [{ email, list, consent: true, consent_source: 'telning.com form', confirm_token: token, unsubscribed_at: null }], 'email');
  if (!r.ok) return { ok: false, error: 'db' };
  const row = r.data?.[0];
  if (row?.confirmed_at) return { ok: true, already: true };
  const confirm_url = `${HOST}/api/newsletter-confirm?t=${token}`;
  const { subject, html, text } = deps.render('newsletter-confirm', { confirm_url });
  await deps.sendEmail({ to: email, from: deps.from, subject, html, text });
  return { ok: true, pending: true };
}
export async function confirm(token, deps) {
  if (!token || token.length < 20) return { ok: false, error: 'token' };
  const r = await deps.db.select('newsletter_subscribers', `confirm_token=eq.${encodeURIComponent(token)}&select=id,email,confirmed_at`);
  const row = r.ok && r.data?.[0];
  if (!row) return { ok: false, error: 'token' };
  if (!row.confirmed_at) {
    await deps.db.update('newsletter_subscribers', `id=eq.${row.id}`, { confirmed_at: new Date().toISOString() }, { prefer: 'return=minimal' });
    const unsubscribe_url = `${HOST}/api/newsletter-unsubscribe?t=${token}`;
    const { subject, html, text } = deps.render('newsletter-welcome', { unsubscribe_url });
    try { await deps.sendEmail({ to: row.email, from: deps.from, subject, html, text, headers: { 'List-Unsubscribe': `<${unsubscribe_url}>` } }); } catch { deps.log?.({ event: 'welcome-failed' }); }
  }
  return { ok: true };
}
export async function unsubscribe(token, deps) {
  if (!token || token.length < 20) return { ok: false, error: 'token' };
  const r = await deps.db.update('newsletter_subscribers', `confirm_token=eq.${encodeURIComponent(token)}`, { unsubscribed_at: new Date().toISOString() });
  return { ok: r.ok && Array.isArray(r.data) && r.data.length > 0 };
}
export const page = (title, text) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | Telning</title><style>body{margin:0;padding:48px 16px;background:#f6f1e8;color:#16140f;font:18px/1.6 "Instrument Sans",system-ui,sans-serif}main{max-width:560px;margin:0 auto;background:#fffdf8;border-radius:28px;padding:32px}h1{font-family:Fraunces,Georgia,serif;font-size:32px;margin:0 0 12px}a{color:#16140f}</style></head><body><main><h1>${title}</h1><p>${text}</p><p><a href="https://telning.com/">Back to telning.com</a></p></main></body></html>`;
