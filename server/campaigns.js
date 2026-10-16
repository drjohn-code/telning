/* Marketing emails from the admin (/admin/marketing): one template (logo, picture, headline, text, button, the
   standard footer with an unsubscribe link), written in the admin and sent to the people who agreed to hear from us:
   confirmed newsletter sign-ups, buyers who ticked "Letters from Pim" at checkout, and a pasted list (only when the
   admin confirms those people agreed). Unsubscribed addresses are always skipped. Every email has its own one-click
   unsubscribe link and the List-Unsubscribe headers. api/admin-campaign.js wires it. Logs carry no addresses. */
import { unsubscribeUrl } from './unsubscribe.js';
import { toText } from './emails.js';

const EMAIL = /^[^\s@<>,;"'()]+@[^\s@<>,;"'()]+\.[a-z]{2,}$/i;
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// links in a campaign must be https; TELNING_DEV_URLS=1 (local test server only, never in Vercel) also allows http://localhost
const https = (u) => /^https:\/\/[^\s<>"]+$/.test(String(u || '').trim()) || (process.env.TELNING_DEV_URLS === '1' && /^http:\/\/localhost:\d+\/[^\s<>"]*$/.test(String(u || '').trim()));
const UNSUB = 'https://telning.com/__unsubscribe__';

/** A pasted list: every address in the text (one per line, or with commas, or "Name <a@b.se>"). */
export function parseList(text) {
  const found = String(text || '').match(/[^\s<>,;"'()]+@[^\s<>,;"'()]+/g) || [];
  const valid = new Set(), invalid = [];
  for (const raw of found) { const e = raw.toLowerCase().replace(/[.]+$/, ''); if (EMAIL.test(e)) valid.add(e); else invalid.push(raw); }
  return { valid: [...valid], invalid };
}

/** The text box → email HTML: a blank line starts a new paragraph, **bold**, and https links become links. */
export function textToHtml(text) {
  const paras = String(text || '').replace(/\r/g, '').trim().split(/\n\s*\n/).filter((x) => x.trim());
  return paras.map((para, i) => {
    let h = esc(para.trim()).replace(/\n/g, '<br>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(https:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#16140f;text-decoration:underline;text-decoration-color:#ce4029">$1</a>');
    return `<p style="margin:0 0 ${i === paras.length - 1 ? 0 : 14}px">${h}</p>`;
  }).join('');
}

/** Check and clean what the admin wrote. strict: everything needed to send. → { ok, c } or { ok: false, error } */
export function cleanCampaign(b = {}, strict = true) {
  const t = (v, n) => String(v ?? '').trim().slice(0, n);
  const c = {
    subject: t(b.subject, 150), preheader: t(b.preheader, 150), headline: t(b.headline, 150), text: t(b.text, 6000),
    image: t(b.image, 500), imageAlt: t(b.imageAlt, 200), imageLink: t(b.imageLink, 500), ctaLabel: t(b.ctaLabel, 40), ctaUrl: t(b.ctaUrl, 500),
  };
  if (!strict) return { ok: true, c };
  if (!c.subject) return { ok: false, error: 'subject' };
  if (!c.text && !c.headline) return { ok: false, error: 'text' };
  if (c.image && !https(c.image)) return { ok: false, error: 'image' };
  if (c.imageLink && !https(c.imageLink)) return { ok: false, error: 'imageLink' };
  if ((c.ctaLabel && !c.ctaUrl) || (!c.ctaLabel && c.ctaUrl)) return { ok: false, error: 'cta' };
  if (c.ctaUrl && !https(c.ctaUrl)) return { ok: false, error: 'ctaUrl' };
  return { ok: true, c };
}

/** The template variables of a campaign. */
export function campaignData(c, unsubscribe = UNSUB) {
  return {
    subject: c.subject || 'Your subject', preheader: c.preheader || c.headline || '', headline: c.headline, body_html: textToHtml(c.text) || '',
    image: https(c.image), image_url: c.image, image_alt: c.imageAlt || '', image_link_url: c.imageLink || c.ctaUrl || 'https://telning.com/',
    cta: !!(c.ctaLabel && https(c.ctaUrl)), cta_url: c.ctaUrl, cta_label: c.ctaLabel, unsubscribe_url: unsubscribe,
  };
}

/** All rows of a select, 1000 at a time (Supabase answers at most 1000 rows per call). */
async function all(db, table, query) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await db.select(table, `${query}&limit=1000&offset=${from}`);
    if (!r.ok) throw new Error(`db ${table} ${r.status}`);
    out.push(...(r.data || []));
    if (!r.data || r.data.length < 1000) return out;
  }
}

/** Who gets it: sources ['newsletter', 'buyers', 'pasted'], minus unsubscribed addresses. */
export async function recipients({ sources = [], pasted = '', pastedAgreed = false }, db) {
  const want = new Set(sources);
  const counts = { newsletter: 0, buyers: 0, pasted: 0, invalid: 0, suppressed: 0, total: 0 };
  const emails = new Set();
  let error = null;
  if (want.has('newsletter')) {
    const rows = await all(db, 'newsletter_subscribers', 'select=email&confirmed_at=not.is.null&unsubscribed_at=is.null');
    counts.newsletter = rows.length; rows.forEach((r) => emails.add(String(r.email).toLowerCase()));
  }
  if (want.has('buyers')) {
    const rows = await all(db, 'customers', 'select=email&marketing_consent=eq.true');
    counts.buyers = rows.length; rows.forEach((r) => emails.add(String(r.email).toLowerCase()));
  }
  if (want.has('pasted')) {
    const list = parseList(pasted);
    counts.invalid = list.invalid.length;
    if (list.valid.length && !pastedAgreed) error = 'agreed';   // the list is left out until the admin ticks the box
    else { counts.pasted = list.valid.length; list.valid.forEach((e) => emails.add(e)); }
  }
  emails.delete('deleted@invalid');
  if (emails.size) {
    const sup = new Set((await all(db, 'email_suppressions', 'select=email')).map((r) => String(r.email).toLowerCase()));
    for (const e of [...emails]) if (sup.has(e)) { emails.delete(e); counts.suppressed++; }
  }
  counts.total = emails.size;
  return { emails: [...emails].sort(), counts, ...(error ? { error } : {}) };
}

/**
 * body: { action: 'preview' | 'count' | 'test' | 'send', campaign: {…}, sources, pasted, pastedAgreed }
 * admin: { email } (the signed-in admin; tests go to this address)
 * deps: { db: { select, insert, update }, render, sendEmail, sendBatch, from, contact, sleep?, log? }
 */
export async function handleCampaign(body, admin, deps) {
  const { log = () => {}, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = deps;
  const action = body?.action;
  const bad = (error, extra = {}) => ({ status: 400, body: { ok: false, error, ...extra } });

  if (action === 'preview') {
    const { c } = cleanCampaign(body.campaign, false);
    const { subject, html } = deps.render('campaign', campaignData(c, unsubscribeUrl(admin.email)));
    return { status: 200, body: { ok: true, subject, html } };
  }
  if (action === 'count') {
    const r = await recipients(body, deps.db);
    return { status: 200, body: { ok: true, counts: r.counts, ...(r.error ? { warning: r.error } : {}) } };
  }
  const v = cleanCampaign(body.campaign, true);
  if (!v.ok) return bad(v.error);
  const c = v.c;
  const mail = (to, subject) => {
    const unsub = unsubscribeUrl(to);
    const r = deps.render('campaign', campaignData(c, unsub));
    return { to, from: deps.from, replyTo: deps.contact, subject: subject || r.subject, html: r.html, text: r.text, headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
  };

  if (action === 'test') {
    try { await deps.sendEmail(mail(admin.email, `[Test] ${c.subject}`)); } catch (e) { log({ event: 'campaign-test-failed' }); return { status: 502, body: { ok: false, error: 'email' } }; }
    return { status: 200, body: { ok: true, to: admin.email } };
  }
  if (action !== 'send') return bad('action');

  const r = await recipients(body, deps.db);
  if (r.error) return bad(r.error, { counts: r.counts });
  if (!r.emails.length) return bad('noRecipients', { counts: r.counts });
  const row = await deps.db.insert('campaigns', [{ subject: c.subject, preheader: c.preheader || null, content: c, sources: body.sources || [], recipients: r.emails.length, skipped: r.counts.suppressed + r.counts.invalid, status: 'sending', created_by: admin.email }]);
  const campaignId = row.ok && row.data?.[0]?.id ? row.data[0].id : null;

  // render once, then give each person their own unsubscribe link
  const base = deps.render('campaign', campaignData(c, UNSUB));
  const text = toText(base.html);
  let sent = 0, failed = 0;
  for (let i = 0; i < r.emails.length; i += 100) {
    const chunk = r.emails.slice(i, i + 100);
    const msgs = chunk.map((to) => {
      const unsub = unsubscribeUrl(to);
      return { to, from: deps.from, replyTo: deps.contact, subject: base.subject, html: base.html.split(UNSUB).join(unsub.replace(/&/g, '&amp;')), text: text.split(UNSUB).join(unsub), headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
    });
    let ids = [], ok = true;
    try { ids = await deps.sendBatch(msgs); } catch { ok = false; log({ event: 'campaign-batch-failed', at: i }); }
    if (ok) sent += chunk.length; else failed += chunk.length;
    await deps.db.insert('email_log', chunk.map((to, k) => ({ template: 'campaign', to_email: to, subject: base.subject, campaign_id: campaignId, provider_id: ids[k] || null, status: ok ? 'sent' : 'failed', error: ok ? null : 'batch refused' })), { prefer: 'return=minimal' });
    if (i + 100 < r.emails.length) await sleep(600);   // Resend allows 2 calls a second
  }
  if (campaignId) await deps.db.update('campaigns', `id=eq.${campaignId}`, { sent, failed, status: sent ? 'sent' : 'failed', sent_at: new Date().toISOString() }, { prefer: 'return=minimal' });
  log({ event: 'campaign', sent, failed, skipped: r.counts.suppressed });
  return { status: 200, body: { ok: true, campaignId, sent, failed, skipped: r.counts.suppressed + r.counts.invalid, counts: r.counts } };
}
