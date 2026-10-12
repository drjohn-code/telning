/* Telning admin: Supabase Auth in the browser (anon key + the user's session; RLS lets only admin_users read),
   one small router by data-admin-page, tables with search and filters, CSV export, notes and statuses, GDPR export
   and delete (SQL functions), email previews, a 30-minute idle timeout and a login back-off. No service role key. */
import { createClient } from '@supabase/supabase-js';

const body = document.body;
const URL_ = body.dataset.supabaseUrl, ANON = body.dataset.supabaseAnon, PAGE = body.dataset.adminPage;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (cents, cur) => cents == null ? '—' : new Intl.NumberFormat('en-IE', { style: 'currency', currency: cur || 'EUR' }).format(cents / 100);
const when = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const pill = (s) => `<span class="ad-pill is-${esc(s)}">${esc(s)}</span>`;
const q = new URLSearchParams(location.search);
let sb = null, me = null;

function msg(text, err = false) { const el = $('[data-page-msg]'); if (!el) return; el.textContent = text; el.classList.toggle('is-err', err); el.hidden = !text; }
function csv(rows, name) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const line = (r) => keys.map((k) => { const v = r[k]; const s = v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''); return `"${s.replace(/"/g, '""')}"`; }).join(',');
  const blob = new Blob([keys.join(',') + '\n' + rows.map(line).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${name}-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}
function table(el, cols, rows, empty = 'Nothing here yet.') {
  if (!rows || !rows.length) { el.innerHTML = `<div class="ad-empty">${esc(empty)}</div>`; return; }
  el.innerHTML = `<table class="ad-table"><thead><tr>${cols.map((c) => `<th>${esc(c.h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/* ---------- auth ---------- */
const FAILS = 'tn-admin-fails';
async function boot() {
  if (!URL_ || !ANON) { $('[data-notconf]').hidden = false; return; }
  sb = createClient(URL_, ANON, { auth: { persistSession: true, storageKey: 'tn-admin' } });
  const { data: { session } } = await sb.auth.getSession();
  if (session) await enter(session); else showLogin();
  sb.auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_OUT') showLogin(); });
}
function showLogin() { $('[data-login]').hidden = false; $('[data-app]').hidden = true; }
async function enter(session) {
  const { data: admin } = await sb.from('admin_users').select('email,role').eq('user_id', session.user.id).maybeSingle();
  if (!admin) { await sb.auth.signOut(); loginMsg('This account is not an admin.'); showLogin(); return; }
  me = { ...session.user, role: admin.role };
  $('[data-login]').hidden = true; $('[data-app]').hidden = false;
  $('[data-user-email]').textContent = me.email;
  idleTimer();
  try { await (PAGES[PAGE] || (async () => {}))(); } catch (e) { msg(`Could not load: ${e.message || e}`, true); }
}
function loginMsg(t, err = true) { const el = $('[data-login-msg]'); el.textContent = t; el.hidden = !t; el.classList.toggle('is-err', err); }
$('[data-login-form]')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button');
  const fails = JSON.parse(localStorage.getItem(FAILS) || '{"n":0,"t":0}');
  if (fails.n >= 5 && Date.now() - fails.t < 60000) { loginMsg(`Too many tries. Wait ${Math.ceil((60000 - (Date.now() - fails.t)) / 1000)} s.`); return; }
  btn.disabled = true; loginMsg('');
  const { data, error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
  btn.disabled = false;
  if (error) { const n = fails.n >= 5 ? 1 : fails.n + 1; localStorage.setItem(FAILS, JSON.stringify({ n, t: Date.now() })); loginMsg(error.message.includes('Invalid') ? 'Wrong email or password.' : error.message); return; }
  localStorage.removeItem(FAILS);
  await enter(data.session);
});
$('[data-signout]')?.addEventListener('click', () => sb.auth.signOut());
function idleTimer() {
  let t;
  const reset = () => { clearTimeout(t); t = setTimeout(() => { sb.auth.signOut(); loginMsg('Signed out after 30 minutes without activity.', false); }, 30 * 60 * 1000); };
  ['click', 'keydown', 'mousemove', 'touchstart'].forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
  reset();
}

/* ---------- pages ---------- */
const PAGES = {
  async '/admin'() {
    const [{ data: rev }, { data: top }, { data: fu }, { data: ff }, { data: recent }] = await Promise.all([
      sb.from('v_revenue').select('*'), sb.from('v_top_products').select('*'),
      sb.from('follow_ups').select('id', { count: 'exact', head: true }).neq('status', 'done'),
      sb.from('fulfilments').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      sb.from('orders').select('id,number,email,total_cents,currency,status,placed_at').order('placed_at', { ascending: false }).limit(8),
    ]);
    const tiles = [];
    for (const r of rev || []) tiles.push([`Today · ${r.currency}`, money(r.today_cents || 0, r.currency)], [`7 days · ${r.currency}`, money(r.last7_cents || 0, r.currency)], [`30 days · ${r.currency}`, money(r.last30_cents || 0, r.currency)], [`Orders 30 d · ${r.currency}`, r.orders30 || 0], [`Average order · ${r.currency}`, money(Math.round(r.aov30_cents || 0), r.currency)]);
    const { count: openCount } = await sb.from('follow_ups').select('id', { count: 'exact', head: true }).neq('status', 'done');
    const { count: failedCount } = await sb.from('fulfilments').select('id', { count: 'exact', head: true }).in('status', ['rejected']);
    tiles.push(['Open follow-ups', openCount || 0], ['Failed fulfilments', failedCount || 0]);
    $('[data-tiles]').innerHTML = tiles.map(([k, v]) => `<li class="ad-tile"><b>${esc(v)}</b><span>${esc(k)}</span></li>`).join('') || '<li class="ad-empty">No orders yet.</li>';
    table($('[data-top]'), [{ h: 'Product', f: (r) => esc(r.name) }, { h: 'Sold (30 d)', num: true, f: (r) => r.qty }, { h: 'Orders', num: true, f: (r) => r.orders }], top);
    table($('[data-recent]'), [{ h: 'Order', f: (r) => `<a href="/admin/order?id=${r.id}">${esc(r.number)}</a>` }, { h: 'Customer', f: (r) => esc(r.email) }, { h: 'Total', num: true, f: (r) => money(r.total_cents, r.currency) }, { h: 'Status', f: (r) => pill(r.status) }, { h: 'Placed', f: (r) => when(r.placed_at) }], recent);
  },
  async '/admin/orders'() {
    const el = $('[data-list]');
    const load = async () => {
      let qy = sb.from('orders').select('id,number,email,name,country,currency,total_cents,status,placed_at,fulfilments(partner,status)').order('placed_at', { ascending: false }).limit(200);
      const s = $('[data-search]').value.trim(), st = $('[data-status]').value, c = $('[data-country]').value.trim().toUpperCase();
      if (s) qy = qy.or(`number.ilike.%${s}%,email.ilike.%${s}%,name.ilike.%${s}%`);
      if (st) qy = qy.eq('status', st);
      if (c) qy = qy.eq('country', c);
      const { data, error } = await qy;
      if (error) return msg(error.message, true);
      const partner = $('[data-partner]').value;
      const rows = partner ? data.filter((o) => (o.fulfilments || []).some((f) => f.partner === partner)) : data;
      table(el, [{ h: 'Order', f: (r) => `<a href="/admin/order?id=${r.id}">${esc(r.number)}</a>` }, { h: 'Customer', f: (r) => `${esc(r.name || '')}<br><small>${esc(r.email)}</small>` }, { h: 'Country', f: (r) => esc(r.country || '') }, { h: 'Total', num: true, f: (r) => money(r.total_cents, r.currency) }, { h: 'Status', f: (r) => pill(r.status) }, { h: 'Partners', f: (r) => (r.fulfilments || []).map((f) => `${esc(f.partner)} ${pill(f.status)}`).join('<br>') }, { h: 'Placed', f: (r) => when(r.placed_at) }], rows, 'No orders match.');
      el.rows = rows;
    };
    $$('[data-search],[data-status],[data-country],[data-partner]').forEach((i) => i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', load));
    $('[data-csv]').addEventListener('click', () => csv((el.rows || []).map(({ fulfilments, ...r }) => ({ ...r, partners: (fulfilments || []).map((f) => `${f.partner}:${f.status}`).join(' ') })), 'orders'));
    await load();
  },
  async '/admin/order'() {
    const id = q.get('id');
    const { data: o, error } = await sb.from('orders').select('*,order_items(*),fulfilments(*),email_log(*),follow_ups(*)').eq('id', id).single();
    if (error || !o) return msg('Order not found.', true);
    $('[data-title]').textContent = `Order ${o.number}`;
    const a = o.address || {};
    $('[data-summary]').innerHTML = `<p><strong>${esc(o.name || '')}</strong> · <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>${o.phone ? ` · ${esc(o.phone)}` : ''}</p><p>${[a.line1, a.line2, `${a.postal_code || ''} ${a.city || ''}`.trim(), a.state, a.country].filter(Boolean).map(esc).join('<br>')}</p><p>${money(o.total_cents, o.currency)} · shipping ${money(o.shipping_cents, o.currency)} · tax ${money(o.tax_cents, o.currency)} · ${pill(o.status)} · ${o.live ? 'LIVE' : 'TEST'} · ${when(o.placed_at)}</p><p><a href="https://dashboard.stripe.com/${o.live ? '' : 'test/'}checkout/sessions/${esc(o.stripe_session_id)}" target="_blank" rel="noopener">Open in Stripe</a>${o.customer_id ? ` · <a href="/admin/customer?id=${o.customer_id}">Customer</a>` : ''}</p>`;
    table($('[data-items]'), [{ h: 'Item', f: (r) => `${esc(r.name)}${r.variant ? `<br><small>${esc(r.variant)}</small>` : ''}` }, { h: 'Qty', num: true, f: (r) => r.qty }, { h: 'Amount', num: true, f: (r) => money(r.amount_cents, o.currency) }, { h: 'Partner', f: (r) => esc(r.partner || '') }], o.order_items);
    table($('[data-parcels]'), [{ h: 'Partner', f: (r) => esc(r.partner) }, { h: 'Status', f: (r) => pill(r.status) }, { h: 'Partner order', f: (r) => esc(r.partner_order_id || '—') }, { h: 'Tracking', f: (r) => r.tracking_url ? `<a href="${esc(r.tracking_url)}" target="_blank" rel="noopener">${esc(r.tracking_number || 'link')}</a>` : esc(r.tracking_number || '—') }, { h: 'Last update', f: (r) => when(r.last_update) }, { h: 'Error', f: (r) => esc(r.error || '') }], o.fulfilments, 'No parcels recorded yet.');
    table($('[data-emails]'), [{ h: 'Template', f: (r) => esc(r.template) }, { h: 'To', f: (r) => esc(r.to_email) }, { h: 'Status', f: (r) => pill(r.status) }, { h: 'Sent', f: (r) => when(r.created_at) }], o.email_log, 'No emails logged.');
    const st = $('[data-order-status]'); st.value = o.status;
    $('[data-order-notes]').value = o.notes || '';
    $('[data-save-order]').addEventListener('click', async () => {
      const { error: e2 } = await sb.from('orders').update({ status: st.value, notes: $('[data-order-notes]').value }).eq('id', id);
      msg(e2 ? e2.message : 'Saved.', !!e2);
    });
    $('[data-add-followup]').addEventListener('click', async () => {
      const subject = prompt('Follow-up subject'); if (!subject) return;
      const { error: e3 } = await sb.from('follow_ups').insert({ type: 'customer', order_id: id, customer_id: o.customer_id, subject, status: 'open', due_at: new Date().toISOString().slice(0, 10) });
      msg(e3 ? e3.message : 'Follow-up added.', !!e3);
    });
  },
  async '/admin/customers'() {
    const el = $('[data-list]');
    const load = async () => {
      let qy = sb.from('customers').select('*').order('last_order_at', { ascending: false, nullsFirst: false }).limit(300);
      const s = $('[data-search]').value.trim(); if (s) qy = qy.or(`email.ilike.%${s}%,name.ilike.%${s}%`);
      const { data, error } = await qy; if (error) return msg(error.message, true);
      table(el, [{ h: 'Customer', f: (r) => `<a href="/admin/customer?id=${r.id}">${esc(r.name || r.email)}</a><br><small>${esc(r.email)}</small>` }, { h: 'Country', f: (r) => esc(r.country || '') }, { h: 'Orders', num: true, f: (r) => r.orders_count }, { h: 'Total spent', num: true, f: (r) => money(r.total_spent_cents, r.currency) }, { h: 'Consent', f: (r) => r.marketing_consent ? pill('yes') : pill('no') }, { h: 'Last order', f: (r) => when(r.last_order_at) }], data, 'No customers yet.');
      el.rows = data;
    };
    $('[data-search]').addEventListener('input', load);
    $('[data-csv]').addEventListener('click', () => csv(el.rows || [], 'customers'));
    await load();
  },
  async '/admin/customer'() {
    const id = q.get('id');
    const { data: c, error } = await sb.from('customers').select('*,orders(id,number,total_cents,currency,status,placed_at)').eq('id', id).single();
    if (error || !c) return msg('Customer not found.', true);
    $('[data-title]').textContent = c.name || c.email;
    $('[data-summary]').innerHTML = `<p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a>${c.phone ? ` · ${esc(c.phone)}` : ''} · ${esc(c.country || '')}</p><p>${c.orders_count} orders · ${money(c.total_spent_cents, c.currency)} · marketing consent: ${c.marketing_consent ? 'yes' : 'no'}${c.consent_at ? ` (${when(c.consent_at)})` : ''}</p>`;
    table($('[data-orders]'), [{ h: 'Order', f: (r) => `<a href="/admin/order?id=${r.id}">${esc(r.number)}</a>` }, { h: 'Total', num: true, f: (r) => money(r.total_cents, r.currency) }, { h: 'Status', f: (r) => pill(r.status) }, { h: 'Placed', f: (r) => when(r.placed_at) }], c.orders);
    $('[data-notes]').value = c.notes || '';
    $('[data-save]').addEventListener('click', async () => { const { error: e } = await sb.from('customers').update({ notes: $('[data-notes]').value }).eq('id', id); msg(e ? e.message : 'Saved.', !!e); });
    $('[data-export]').addEventListener('click', async () => {
      const { data, error: e } = await sb.rpc('gdpr_export', { p_customer: id });
      if (e) return msg(e.message, true);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `customer-${c.email}.json` }); a.click();
    });
    $('[data-delete]').addEventListener('click', async () => {
      if (prompt(`Type the email to delete this customer's personal data (orders stay, anonymised):`) !== c.email) return;
      const { error: e } = await sb.rpc('gdpr_delete', { p_customer: id });
      if (e) return msg(e.message, true);
      location.href = '/admin/customers';
    });
  },
  async '/admin/follow-ups'() {
    const el = $('[data-list]'); let tab = 'partner';
    const load = async () => {
      const st = $('[data-status]').value;
      let qy = sb.from('follow_ups').select('*,orders(number)').eq('type', tab).order('due_at', { ascending: true }).limit(300);
      if (st) qy = qy.eq('status', st); else qy = qy.neq('status', 'done');
      const { data, error } = await qy; if (error) return msg(error.message, true);
      table(el, [{ h: 'Due', f: (r) => esc(r.due_at || '') }, { h: 'Subject', f: (r) => `<strong>${esc(r.subject)}</strong><br><small>${esc(r.note || '')}</small>` }, { h: 'Order', f: (r) => r.order_id ? `<a href="/admin/order?id=${r.order_id}">${esc(r.orders?.number || 'order')}</a>` : '—' }, { h: 'Status', f: (r) => `<select data-fu-status="${r.id}"><option ${r.status === 'open' ? 'selected' : ''}>open</option><option ${r.status === 'waiting' ? 'selected' : ''}>waiting</option><option ${r.status === 'done' ? 'selected' : ''}>done</option></select>` }, { h: 'Note', f: (r) => `<button class="ad-linkbtn" data-fu-note="${r.id}">edit</button>` }], data, 'Inbox zero.');
      el.rows = data;
      $$('[data-fu-status]', el).forEach((s) => s.addEventListener('change', async () => { const { error: e } = await sb.from('follow_ups').update({ status: s.value }).eq('id', s.dataset.fuStatus); msg(e ? e.message : 'Updated.', !!e); }));
      $$('[data-fu-note]', el).forEach((b) => b.addEventListener('click', async () => { const row = data.find((r) => r.id === b.dataset.fuNote); const note = prompt('Note', row.note || ''); if (note === null) return; const { error: e } = await sb.from('follow_ups').update({ note }).eq('id', row.id); msg(e ? e.message : 'Saved.', !!e); load(); }));
    };
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; $$('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); load(); }));
    $('[data-status]').addEventListener('change', load);
    $('[data-csv]').addEventListener('click', () => csv((el.rows || []).map(({ orders, ...r }) => ({ ...r, order_number: orders?.number || '' })), `follow-ups-${tab}`));
    $('[data-check-stale]').addEventListener('click', async () => { const { data, error } = await sb.rpc('open_stale_fulfilment_follow_ups'); msg(error ? error.message : `${data} new follow-up(s) opened for parcels with no update for 3 days.`, !!error); load(); });
    await load();
  },
  async '/admin/newsletter'() {
    const el = $('[data-list]');
    const { data, error } = await sb.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }).limit(1000);
    if (error) return msg(error.message, true);
    const n = data.length, conf = data.filter((r) => r.confirmed_at && !r.unsubscribed_at).length;
    $('[data-tiles]').innerHTML = [['Sign-ups', n], ['Confirmed', conf], ['Unsubscribed', data.filter((r) => r.unsubscribed_at).length]].map(([k, v]) => `<li class="ad-tile"><b>${v}</b><span>${k}</span></li>`).join('');
    table(el, [{ h: 'Email', f: (r) => esc(r.email) }, { h: 'List', f: (r) => esc(r.list) }, { h: 'Consent', f: (r) => r.consent ? 'yes' : 'no' }, { h: 'Confirmed', f: (r) => when(r.confirmed_at) }, { h: 'Unsubscribed', f: (r) => when(r.unsubscribed_at) }, { h: 'Signed up', f: (r) => when(r.created_at) }], data, 'No sign-ups in the database yet (sign-ups also live in Resend).');
    $('[data-csv]').addEventListener('click', () => csv(data, 'newsletter'));
  },
  async '/admin/quotes'() {
    const el = $('[data-list]');
    const { data, error } = await sb.from('org_quotes').select('*').order('created_at', { ascending: false });
    if (error) return msg(error.message, true);
    table(el, [{ h: 'Organisation', f: (r) => `<strong>${esc(r.organisation)}</strong><br><small>${esc(r.country || '')} · ${esc(r.children || '')} children</small>` }, { h: 'Email', f: (r) => `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` }, { h: 'Wish', f: (r) => esc(r.wish) }, { h: 'Invoice / sample', f: (r) => `${r.invoice ? 'invoice' : ''} ${r.sample ? 'sample' : ''}` }, { h: 'Status', f: (r) => `<select data-q-status="${r.id}">${['new', 'quoted', 'invoiced', 'won', 'lost'].map((s) => `<option ${r.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>` }, { h: 'Received', f: (r) => when(r.created_at) }], data, 'No quote requests in the database yet (they also arrive by email).');
    $$('[data-q-status]', el).forEach((s) => s.addEventListener('change', async () => { const { error: e } = await sb.from('org_quotes').update({ status: s.value }).eq('id', s.dataset.qStatus); msg(e ? e.message : 'Updated.', !!e); }));
    $('[data-csv]').addEventListener('click', () => csv(data, 'quotes'));
  },
  async '/admin/send-pim'() {
    const el = $('[data-list]');
    const { data, error } = await sb.from('send_pim_submissions').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) return msg(error.message, true);
    table(el, [{ h: 'Child', f: (r) => `${esc(r.child_first_name || '')}${r.child_age ? `, ${r.child_age}` : ''}` }, { h: 'Book', f: (r) => esc(r.book_sku || '') }, { h: 'Ending', f: (r) => esc(r.ending || '') }, { h: 'Parent', f: (r) => esc(r.parent_email) }, { h: 'Status', f: (r) => pill(r.status) }, { h: 'Received', f: (r) => when(r.created_at) }, { h: 'Deleted after', f: (r) => esc(r.delete_after) }], data, 'No submissions in the database yet (they also arrive by email).');
    $('[data-csv]').addEventListener('click', () => csv(data, 'send-pim'));
  },
  async '/admin/emails'() {
    const { data, error } = await sb.from('email_log').select('*').order('created_at', { ascending: false }).limit(300);
    if (!error) table($('[data-log]'), [{ h: 'Sent', f: (r) => when(r.created_at) }, { h: 'Template', f: (r) => esc(r.template) }, { h: 'To', f: (r) => esc(r.to_email) }, { h: 'Subject', f: (r) => esc(r.subject) }, { h: 'Status', f: (r) => pill(r.status) }, { h: 'Error', f: (r) => esc(r.error || '') }], data, 'No emails logged yet.');
    else msg(error.message, true);
    previews();
  },
  async '/admin/products'() {
    const { data, error } = await sb.from('products').select('*').order('category').order('name');
    if (error) return msg(error.message, true);
    table($('[data-list]'), [{ h: 'SKU', f: (r) => `<code>${esc(r.sku)}</code>` }, { h: 'Name', f: (r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>` }, { h: 'Type', f: (r) => esc(r.type) }, { h: 'Price (EUR)', num: true, f: (r) => money(r.price_eur_cents, 'EUR') }, { h: 'Status', f: (r) => pill(r.status === 'coming_soon' ? 'waiting' : r.status) + ` ${esc(r.status.replace('_', ' '))}` }], data, 'Run scripts/seed.mjs to load the product list.');
    $('[data-csv]').addEventListener('click', () => csv(data, 'products'));
  },
  async '/admin/password'() {
    $('[data-pw-form]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.pw1.value !== f.pw2.value) return msg('The two passwords differ.', true);
      if (f.pw1.value.length < 16) return msg('Use at least 16 characters.', true);
      const { error } = await sb.auth.updateUser({ password: f.pw1.value });
      msg(error ? error.message : 'Password changed.', !!error); if (!error) f.reset();
    });
  },
};
/* email previews: every compiled template with sample data, at Gmail (600), Apple Mail (700) and Outlook (640) widths */
function previews() {
  const sel = $('[data-tpl]'), frame = $('[data-frame]'); if (!sel || !frame) return;
  const show = () => { frame.src = `/admin/email-preview/${sel.value}.html`; };
  sel.addEventListener('change', show);
  $$('[data-width]').forEach((b) => b.addEventListener('click', () => { $$('[data-width]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); frame.style.width = b.dataset.width + 'px'; }));
  show();
}
boot();
