/* Email sign-ups ("Letters from Pim", the TADA guide, the teacher pack). Pure logic; api/subscribe.js wires it.
   The address goes into Resend as a contact in one segment per list (segments are created on first use and found by
   name). If Resend cannot store the contact (for example a "Sending access" key), the sign-up is emailed to the team
   inbox instead, so nothing is lost. Logs carry no addresses. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const LISTS = { news: 'Letters from Pim', guide: 'TADA guide', teacher: 'Teacher pack' };
const RATE = { max: 10, windowMs: 10 * 60 * 1000 };
const hits = new Map();
const segmentIds = new Map();      // list name → Resend segment id (per function instance)

function rateLimited(ip, now) {
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE.max;
}
const ok2xx = (r) => r && r.status >= 200 && r.status < 300;

/** Find a segment by name, or create it. Returns the id, or throws with the Resend status. */
export async function segmentId(api, name) {
  if (segmentIds.has(name)) return segmentIds.get(name);
  const list = await api('GET', '/segments');
  if (!ok2xx(list)) throw Object.assign(new Error('segments'), { status: list.status });
  let seg = (list.json?.data || []).find((s) => s.name === name);
  if (!seg) {
    const made = await api('POST', '/segments', { name });
    if (!ok2xx(made)) throw Object.assign(new Error('segment create'), { status: made.status });
    seg = made.json;
  }
  segmentIds.set(name, seg.id);
  return seg.id;
}
export const _resetCache = () => { segmentIds.clear(); hits.clear(); };

/**
 * input: { fields: { form, email, book?, website? }, ip }
 * deps:  { api(method, path, body) → Promise<{ status, json }> | null (no key), sendEmail({ to, from, subject, text }),
 *          inbox, from, log(obj), now() }
 * Returns { status, body: { ok: true } | { ok: false, error } }.
 */
export async function handleSubscribe(input, deps) {
  const now = (deps.now || Date.now)();
  const log = deps.log || (() => {});
  const f = input.fields || {};
  const list = LISTS[f.form] ? f.form : 'news';
  const done = (status, body, extra) => { log({ ok: !!body.ok, status, list, ...(extra || {}) }); return { status, body }; };

  if (f.website) return done(200, { ok: true }, { honeypot: true });
  if (rateLimited(input.ip || '?', now)) return done(429, { ok: false, error: 'failed' });
  const email = String(f.email || '').trim().toLowerCase();
  if (!email) return done(400, { ok: false, error: 'empty' });
  if (!EMAIL_RE.test(email) || email.length > 254) return done(400, { ok: false, error: 'invalid' });
  if (!deps.api) return done(503, { ok: false, error: 'notReady' });

  // 1. Resend contact in the list's segment
  let why = '';
  try {
    const seg = await segmentId(deps.api, LISTS[list]);
    const made = await deps.api('POST', '/contacts', { email, unsubscribed: false, segments: [{ id: seg }] });
    if (ok2xx(made)) return done(200, { ok: true }, { via: 'contact' });
    // the contact may exist already: add it to the segment by email
    const added = await deps.api('POST', `/contacts/${encodeURIComponent(email)}/segments/${seg}`);
    if (ok2xx(added)) return done(200, { ok: true }, { via: 'segment' });
    why = `contact ${made.status}/${added.status}`;
  } catch (e) {
    why = `segment ${e.status || 'error'}`;
  }

  // 2. Fallback: tell the team by email, so the sign-up is not lost
  try {
    await deps.sendEmail({
      to: deps.inbox, from: deps.from,
      subject: `New sign-up: ${LISTS[list]}`,
      text: [`Someone signed up for "${LISTS[list]}".`, '', `Email: ${email}`, f.book ? `Book: ${String(f.book).slice(0, 60)}` : '',
        '', 'Resend could not store this contact automatically (check that the API key has Full access). Add it to the list by hand.'].filter(Boolean).join('\n'),
    });
    return done(200, { ok: true }, { via: 'email', why });
  } catch (e) {
    return done(502, { ok: false, error: 'failed' }, { why });
  }
}
