/* Supabase from the server (Vercel functions and scripts) through PostgREST with the service role key. Never in the
   browser. Env: SUPABASE_URL (or PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY. Without the key every call is a no-op
   that returns { ok: false, skipped: true }, so the shop keeps working before the database is connected. */
const URL_ = () => process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || 'https://gcecirvleaknxbexzbfn.supabase.co';
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const hasDb = () => !!KEY();

/** One PostgREST call. method GET/POST/PATCH/DELETE; path like "orders?number=eq.T-1"; body for writes.
    prefer: "return=representation" | "resolution=merge-duplicates,return=representation" … */
export async function db(method, path, body, { prefer = 'return=representation', key = KEY(), url = URL_() } = {}) {
  if (!key) return { ok: false, skipped: true, status: 0, data: null };
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: prefer, Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}
export const insert = (table, rows, opts) => db('POST', table, rows, opts);
export const upsert = (table, rows, onConflict, opts = {}) => db('POST', `${table}?on_conflict=${onConflict}`, rows, { prefer: 'resolution=merge-duplicates,return=representation', ...opts });
export const update = (table, filter, patch, opts) => db('PATCH', `${table}?${filter}`, patch, opts);
export const select = (table, query = '', opts) => db('GET', `${table}?${query}`, undefined, opts);
export const rpc = (fn, args = {}, opts) => db('POST', `rpc/${fn}`, args, { prefer: 'return=representation', ...opts });

/** Supabase Auth admin API (service role): create a user with a confirmed email. */
export async function createUser({ email, password, key = KEY(), url = URL_() }) {
  if (!key) return { ok: false, skipped: true };
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: 'admin' } }),
  });
  let data = null; try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

/** Write an order (customer, order, items, fulfilments) after a paid Stripe session. Idempotent on the session id. */
export async function recordOrder(order, { logger = () => {} } = {}) {
  if (!hasDb()) return { skipped: true };
  const ev = await upsert('webhook_events', [{ source: 'stripe', event_id: order.id, type: 'checkout.session.completed', processed: false }], 'source,event_id', { prefer: 'resolution=ignore-duplicates,return=representation' });
  if (ev.ok && Array.isArray(ev.data) && ev.data.length === 0) return { duplicate: true };   // already recorded
  const cust = await upsert('customers', [{ email: order.email.toLowerCase(), name: order.name || null, phone: order.phone || null, country: order.address?.country || null }], 'email');
  const customerId = cust.ok && cust.data?.[0]?.id;
  const o = await upsert('orders', [{
    number: order.number, stripe_session_id: order.id, stripe_payment_intent: order.paymentIntent || null, customer_id: customerId || null,
    email: order.email, name: order.name, phone: order.phone, address: order.address || {}, country: order.address?.country || null, region: order.region || null,
    currency: order.currency, subtotal_cents: order.subtotal ?? null, shipping_cents: order.shipping ?? null, tax_cents: order.tax ?? null, total_cents: order.total, live: !!order.live, status: 'paid',
  }], 'stripe_session_id');
  const orderId = o.ok && o.data?.[0]?.id;
  if (!orderId) { logger({ event: 'db-order-failed', status: o.status }); return { ok: false }; }
  await insert('order_items', order.items.map((it) => ({ order_id: orderId, sku: it.sku, variant: it.variant || null, name: it.name, qty: it.qty, amount_cents: it.amount ?? null, unit_cents: it.amount && it.qty ? Math.round(it.amount / it.qty) : null, partner: it.partner, print_file: it.print || null })), { prefer: 'return=minimal' });
  await upsert('fulfilments', Object.entries(order.parts).map(([partner, items]) => ({ order_id: orderId, partner, status: 'manual', items: items.map((i) => ({ sku: i.sku, variant: i.variant, qty: i.qty, name: i.name })) })), 'order_id,partner', { prefer: 'resolution=merge-duplicates,return=minimal' });
  await update('webhook_events', `source=eq.stripe&event_id=eq.${encodeURIComponent(order.id)}`, { processed: true }, { prefer: 'return=minimal' });
  return { ok: true, orderId, customerId };
}

/** Log one sent email. */
export async function logEmail({ template, to, subject, orderId = null, providerId = null, status = 'sent', error = null }) {
  if (!hasDb()) return { skipped: true };
  return insert('email_log', [{ template, to_email: to, subject, order_id: orderId, provider_id: providerId, status, error }], { prefer: 'return=minimal' });
}
