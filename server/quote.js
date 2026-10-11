/* Quote requests from /organisations (100 books or more, company gifts, invoice payment, a sample book).
   Pure logic; api/quote.js wires it. The request is emailed to the team inbox; nothing is stored. Logs carry no
   names or addresses. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const hits = new Map();

/**
 * input: { fields: { organisation, country, children, wish, email, invoice, sample, website (honeypot) }, ip }
 * deps:  { sendEmail | null, inbox, from, log, now }
 */
export async function handleQuote({ fields = {}, ip = 'x' }, deps) {
  const { log = () => {}, now = () => Date.now() } = deps;
  if (clean(fields.website, 10)) return { status: 200, body: { ok: true } };            // bots: pretend all is fine
  const t = now();
  const arr = (hits.get(ip) || []).filter((x) => t - x < 600000); arr.push(t); hits.set(ip, arr);
  if (arr.length > 6) return { status: 429, body: { ok: false, error: 'rate' } };
  const f = {
    organisation: clean(fields.organisation, 140), country: clean(fields.country, 80), children: clean(fields.children, 12),
    wish: clean(fields.wish, 2000), email: clean(fields.email, 200).toLowerCase(),
    invoice: !!fields.invoice && fields.invoice !== 'false', sample: !!fields.sample && fields.sample !== 'false',
  };
  if (!f.organisation || !f.wish) return { status: 400, body: { ok: false, error: 'missing' } };
  if (!EMAIL_RE.test(f.email)) return { status: 400, body: { ok: false, error: 'email' } };
  if (!deps.sendEmail) return { status: 503, body: { ok: false, error: 'notReady' } };
  const text = [
    'Quote request from telning.com/organisations', '',
    `Organisation: ${f.organisation}`, `Country: ${f.country || '—'}`, `Number of children: ${f.children || '—'}`,
    `Email: ${f.email}`, `Pay by invoice: ${f.invoice ? 'yes' : 'no'}`, `Sample book at print cost: ${f.sample ? 'yes' : 'no'}`, '',
    'What they want:', f.wish, '', 'Answer within two working days.',
  ].join('\n');
  try { await deps.sendEmail({ to: deps.inbox, from: deps.from, replyTo: f.email, subject: `Quote request: ${f.organisation}`, text }); }
  catch { log({ event: 'quote-email-failed' }); return { status: 502, body: { ok: false, error: 'email-send' } }; }
  log({ event: 'quote', invoice: f.invoice, sample: f.sample });
  return { status: 200, body: { ok: true } };
}
export const _reset = () => hits.clear();
