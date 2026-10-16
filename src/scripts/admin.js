/* Telning admin: Supabase Auth in the browser (anon key + the user's session; RLS lets only admin_users read),
   one small router by data-admin-page, tables with search and filters, CSV export, notes and statuses, GDPR export
   and delete (SQL functions), email previews, a 30-minute idle timeout and a login back-off. No service role key. */
import { createClient } from '@supabase/supabase-js';
import { CARRIERS, trackingUrl } from '../../server/carriers.js';

const body = document.body;
// the page code is chosen by the address (data-admin-page only marks the menu item: /admin/order lights up Orders)
const URL_ = body.dataset.supabaseUrl, ANON = body.dataset.supabaseAnon, PAGE = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/admin';
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
function table(el, cols, rows, empty = 'Nothing here yet.', cls = '') {
  if (!rows || !rows.length) { el.innerHTML = `<div class="ad-empty">${esc(empty)}</div>`; return; }
  el.innerHTML = `<table class="ad-table ${cls}"><thead><tr>${cols.map((c) => `<th>${esc(c.h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.num ? 'num' : ''}" data-label="${esc(c.h)}"><div>${c.f(r)}</div></td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
const regionName = (() => { let dn = null; try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { dn = null; } return (code) => { try { return (code && dn?.of(String(code).toUpperCase())) || code || ''; } catch { return code || ''; } }; })();
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
/** The small square product photo the emails use (public/email/products/<sku>.jpg); a paper square when there is none. */
const thumb = (sku, size = 36) => `<img class="ad-thumb" src="/email/products/${encodeURIComponent(sku || 'none')}.jpg" alt="" width="${size}" height="${size}" loading="lazy" onerror="this.style.visibility='hidden'">`;
const addressLines = (a = {}) => [a.line1, a.line2, `${a.postal_code || ''} ${a.city || ''}`.trim(), a.state, regionName(a.country)].filter(Boolean);

/* ---------- buyers: one row per customer with their orders and everything they bought ---------- */
const BUYER_SELECT = '*,orders(id,number,placed_at,status,total_cents,currency,address,live,order_items(sku,name,qty,amount_cents),fulfilments(id,partner,status,carrier,carrier_name,tracking_number,tracking_url,shipped_at))';
const COUNTED = (o) => !['cancelled', 'refunded'].includes(o.status);
function buyerOf(c) {
  const orders = [...(c.orders || [])].sort((a, b) => String(b.placed_at).localeCompare(String(a.placed_at)));
  const latest = orders[0] || {};
  const bought = new Map();
  for (const o of orders.filter(COUNTED)) for (const it of o.order_items || []) {
    const k = it.sku || it.name; const b = bought.get(k) || { sku: it.sku, name: it.name, qty: 0 };
    b.qty += it.qty || 0; bought.set(k, b);
  }
  const products = [...bought.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  const address = latest.address || {};
  return {
    ...c, orders, products, address, city: address.city || '', country: address.country || c.country || '',
    test: orders.length > 0 && orders.every((o) => !o.live),
    search: [c.name, c.email, c.phone, address.city, regionName(address.country || c.country), ...orders.map((o) => o.number), ...products.map((p) => p.name)].join(' ').toLowerCase(),
  };
}
const productLines = (list, max = 3) => list.length ? `<ul class="ad-bought">${list.slice(0, max).map((p) => `<li>${thumb(p.sku, 32)}<span>${esc(p.qty)} × ${esc(p.name)}</span></li>`).join('')}${list.length > max ? `<li class="ad-bought__more">+ ${list.length - max} more</li>` : ''}</ul>` : '—';
const parcelLine = (f) => {
  const c = CARRIERS.find((x) => x.key === f.carrier);
  const who = c && c.key !== 'other' ? c.name : f.carrier_name || 'Parcel';
  if (!f.tracking_number) return `${esc(PARTS[f.partner] || f.partner)}: ${['new', 'manual'].includes(f.status) ? '<span class="ad-pill">to ship</span>' : pill(f.status)}`;
  return `${esc(PARTS[f.partner] || f.partner)}: ${pill(f.status)} ${esc(who)} <a href="${esc(f.tracking_url || '#')}" target="_blank" rel="noopener">${esc(f.tracking_number)}</a>${f.shipped_at ? ` · ${day(f.shipped_at)}` : ''}`;
};

/** POST to one of our admin API routes (api/admin-*.js) with the signed-in user's access token. */
async function api(path, body) {
  const { data: { session } } = await sb.auth.getSession();
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify(body) });
    let json = null; try { json = await res.json(); } catch { json = null; }
    return { status: res.status, ...(json || { ok: false, error: `http ${res.status}` }) };
  } catch { return { status: 0, ok: false, error: 'network' }; }
}

/* ---------- parcels: carrier + tracking number per parcel; saving emails the buyer (api/admin-ship.js) ---------- */
const PARTS = { lulu: 'Books', printful: 'Story Walls, mugs and tote bags', gelato: 'Postcards and greeting cards' };
const SHIP_ERR = { carrier: 'Choose a carrier.', number: 'Check the tracking number: letters, digits, spaces and dashes, 4 to 40 characters.', url: 'The tracking link must start with https://', notShipped: 'Save the shipment first.', auth: 'Your session has ended. Sign in again.', notReady: 'The server is not connected yet (the Supabase key is missing in Vercel).', notFound: 'This parcel was not found.', db: 'Could not save. Try again.', network: 'No connection. Try again.' };
const shipInfo = (f) => (f.shipped_at ? `Shipped ${when(f.shipped_at)} · ${f.notified_at ? `buyer emailed ${when(f.notified_at)}` : 'buyer not emailed'}` : 'Not shipped yet.');
function parcelForm(f, i, n, o) {
  const items = (f.items || []).map((it) => `${esc(it.qty)} × ${esc(it.name || it.sku)}`).join('<br>');
  const opts = CARRIERS.map((c) => `<option value="${c.key}"${f.carrier === c.key ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  return `<form class="ad-parcel" data-ship="${esc(f.id)}" novalidate>
    <div class="ad-parcel__head"><h3>Parcel ${i + 1} of ${n} <span>· ${esc(PARTS[f.partner] || f.partner)}</span></h3>${['new', 'manual'].includes(f.status) ? '<span class="ad-pill">to ship</span>' : pill(f.status)}</div>
    <p class="ad-parcel__items">${items || '—'}</p>
    <div class="ad-parcel__grid">
      <label class="ad-field"><span>Carrier</span><select name="carrier"><option value="">Choose…</option>${opts}</select></label>
      <label class="ad-field" data-other${f.carrier === 'other' ? '' : ' hidden'}><span>Carrier name</span><input class="tn-input" name="carrierName" value="${esc(f.carrier_name || '')}" maxlength="60" autocomplete="off"></label>
      <label class="ad-field"><span>Tracking number</span><input class="tn-input" name="number" value="${esc(f.tracking_number || '')}" autocomplete="off" spellcheck="false"></label>
    </div>
    <label class="ad-field"><span>Tracking link <small>filled in for you. Paste the printer’s link to use that instead.</small></span><input class="tn-input" type="url" name="url" value="${esc(f.tracking_url || '')}" spellcheck="false"></label>
    <div class="ad-parcel__actions">
      <label class="ad-check"><input type="checkbox" name="notify" checked><span>Email the buyer<small>${esc(o.email)}</small></span></label>
      <a class="ad-linkbtn" data-open href="${esc(f.tracking_url || '#')}" target="_blank" rel="noopener"${f.tracking_url ? '' : ' hidden'}>Check the link</a>
      <button class="tn-btn" type="submit">${f.shipped_at ? 'Save changes' : 'Save shipment'}</button>
    </div>
    <p class="ad-small" data-info>${shipInfo(f)}${f.shipped_at ? ' · <button type="button" class="ad-linkbtn" data-resend>Send the email again</button>' : ''}</p>
    <p class="ad-msg" data-msg role="status" hidden></p>
  </form>`;
}
function parcels(o, el, changed, note = {}) {
  const list = o.fulfilments || [];
  if (!list.length) { el.innerHTML = '<div class="ad-empty">No parcels recorded yet.</div>'; return; }
  el.innerHTML = list.map((f, i) => parcelForm(f, i, list.length, o)).join('');
  for (const f of list) {
    const form = el.querySelector(`[data-ship="${CSS.escape(f.id)}"]`);
    const say = (t, err = false) => { const m = form.querySelector('[data-msg]'); m.textContent = t; m.hidden = !t; m.classList.toggle('is-err', err); };
    if (note.id === f.id) say(note.text, note.err);
    const url = form.url, open = form.querySelector('[data-open]');
    let manual = !!f.tracking_url && f.tracking_url !== trackingUrl(f.carrier, f.tracking_number);
    const showOpen = () => { const ok = /^https:\/\/\S+$/.test(url.value.trim()); open.hidden = !ok; if (ok) open.href = url.value.trim(); };
    const auto = () => { form.querySelector('[data-other]').hidden = form.carrier.value !== 'other'; if (!manual) url.value = trackingUrl(form.carrier.value, form.number.value); showOpen(); };
    form.carrier.addEventListener('change', auto);
    form.number.addEventListener('input', auto);
    url.addEventListener('input', () => { manual = url.value.trim() !== ''; if (!manual) auto(); else showOpen(); });
    const after = (r, okText) => {
      if (!r.ok) return say(SHIP_ERR[r.error] || `Could not save (${r.error || r.status}).`, true);
      Object.assign(f, r.parcel); if (r.orderStatus) o.status = r.orderStatus;
      const text = r.emailError ? `${okText} But the email could not be sent: try “Send the email again” later.` : r.emailed ? `${okText} The buyer got the email with the tracking link.` : `${okText} No email was sent.`;
      parcels(o, el, changed, { id: f.id, text, err: !!r.emailError });
      changed(o);
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.carrier.value) return say(SHIP_ERR.carrier, true);
      if (!form.number.value.trim()) return say(SHIP_ERR.number, true);
      if (form.notify.checked && !confirm(`Save this parcel as shipped and email the tracking link to ${o.email}?`)) return;
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.setAttribute('aria-busy', 'true'); say('');
      const r = await api('/api/admin-ship', { parcel: f.id, carrier: form.carrier.value, carrierName: form.carrierName.value, number: form.number.value, url: manual ? url.value.trim() : '', notify: form.notify.checked });
      btn.disabled = false; btn.removeAttribute('aria-busy');
      after(r, 'Saved.');
    });
    form.querySelector('[data-resend]')?.addEventListener('click', async (e) => {
      if (!confirm(`Send the “shipped” email again to ${o.email}?`)) return;
      e.target.disabled = true;
      after(await api('/api/admin-ship', { parcel: f.id, action: 'resend' }), 'Sent again.');
    });
  }
}

/* ---------- the menu on phones: a Menu button opens and closes the list ---------- */
(() => {
  const side = $('[data-side]'), btn = $('[data-menu-btn]');
  if (!side || !btn) return;
  const set = (open) => { side.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); $('[data-menu-label]').textContent = open ? 'Close' : 'Menu'; };
  btn.addEventListener('click', () => set(!side.classList.contains('is-open')));
  side.addEventListener('click', (e) => { if (e.target.closest('.ad-side__menu a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && side.classList.contains('is-open')) { set(false); btn.focus(); } });
})();

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
    const emails = (log) => table($('[data-emails]'), [{ h: 'Template', f: (r) => esc(r.template) }, { h: 'To', f: (r) => esc(r.to_email) }, { h: 'Status', f: (r) => pill(r.status) }, { h: 'Sent', f: (r) => when(r.created_at) }], [...(log || [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), 'No emails logged.');
    emails(o.email_log);
    const st = $('[data-order-status]'); st.value = o.status;
    (o.fulfilments || []).sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || String(a.partner).localeCompare(String(b.partner)));
    parcels(o, $('[data-parcels]'), async () => {
      st.value = o.status;
      const { data: log } = await sb.from('email_log').select('*').eq('order_id', id);
      emails(log);
    });
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
    const { data, error } = await sb.from('customers').select(BUYER_SELECT).order('last_order_at', { ascending: false, nullsFirst: false }).limit(1000);
    if (error) return msg(error.message, true);
    const buyers = (data || []).map(buyerOf);
    const countries = [...new Set(buyers.map((b) => b.country).filter(Boolean))].sort((a, b) => regionName(a).localeCompare(regionName(b)));
    $('[data-country]').innerHTML = '<option value="">All countries</option>' + countries.map((c) => `<option value="${esc(c)}">${esc(regionName(c))}</option>`).join('');
    $('[data-tiles]').innerHTML = [['Buyers', buyers.length], ['Bought more than once', buyers.filter((b) => b.orders.filter(COUNTED).length > 1).length], ['Agreed to marketing emails', buyers.filter((b) => b.marketing_consent).length], ['Countries', countries.length]].map(([k, v]) => `<li class="ad-tile"><b>${esc(v)}</b><span>${esc(k)}</span></li>`).join('');
    const load = () => {
      const s = $('[data-search]').value.trim().toLowerCase(), c = $('[data-country]').value, mk = $('[data-marketing]').value;
      const rows = buyers.filter((b) => (!s || b.search.includes(s)) && (!c || b.country === c) && (!mk || String(!!b.marketing_consent) === mk));
      table(el, [
        { h: 'Buyer', f: (r) => `<a href="/admin/customer?id=${esc(r.id)}">${esc(r.name || r.email)}</a>${r.test ? ' <span class="ad-pill">test</span>' : ''}<br><small>${esc(r.email)}${r.phone ? `<br>${esc(r.phone)}` : ''}</small>` },
        { h: 'Lives in', f: (r) => `${esc(r.city)}${r.city ? '<br>' : ''}<small>${esc(regionName(r.country))}</small>` },
        { h: 'Products bought', f: (r) => productLines(r.products) },
        { h: 'Orders', num: true, f: (r) => r.orders.filter(COUNTED).length },
        { h: 'Spent', num: true, f: (r) => money(r.total_spent_cents, r.currency || r.orders[0]?.currency) },
        { h: 'Marketing', f: (r) => (r.marketing_consent ? pill('yes') : '<span class="ad-pill">no</span>') },
        { h: 'Last order', f: (r) => day(r.last_order_at || r.orders[0]?.placed_at) },
      ], rows, buyers.length ? 'No buyers match.' : 'No buyers yet. They appear here after the first paid order.', 'ad-table--cards ad-table--buyers');
      $('[data-count]').textContent = rows.length === buyers.length ? `${buyers.length} buyers` : `${rows.length} of ${buyers.length} buyers`;
      el.rows = rows;
    };
    $('[data-search]').addEventListener('input', load);
    $$('[data-country],[data-marketing]').forEach((i) => i.addEventListener('change', load));
    $('[data-csv]').addEventListener('click', () => csv((el.rows || []).map((b) => ({
      name: b.name || '', email: b.email, phone: b.phone || '', address_line1: b.address.line1 || '', address_line2: b.address.line2 || '', postal_code: b.address.postal_code || '', city: b.address.city || '', country: regionName(b.country),
      orders: b.orders.filter(COUNTED).length, total_spent: ((b.total_spent_cents || 0) / 100).toFixed(2), currency: b.currency || '', marketing_consent: b.marketing_consent ? 'yes' : 'no',
      first_order: day(b.first_order_at), last_order: day(b.last_order_at), products: b.products.map((p) => `${p.qty} x ${p.name}`).join('; '), order_numbers: b.orders.map((o) => o.number).join(' '),
    })), 'buyers'));
    load();
  },
  async '/admin/customer'() {
    const id = q.get('id');
    const { data, error } = await sb.from('customers').select(BUYER_SELECT).eq('id', id).single();
    if (error || !data) return msg('Buyer not found.', true);
    const c = buyerOf(data);
    $('[data-title]').textContent = c.name || c.email;
    const facts = [
      ['Email', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`], ['Phone', c.phone ? `<a href="tel:${esc(c.phone.replace(/\s+/g, ''))}">${esc(c.phone)}</a>` : '—'],
      ['Delivery address (latest order)', addressLines(c.address).map(esc).join('<br>') || '—'],
      ['Buyer since', day(c.first_order_at || c.orders[c.orders.length - 1]?.placed_at)], ['Orders', esc(c.orders.filter(COUNTED).length)], ['Spent', money(c.total_spent_cents, c.currency || c.orders[0]?.currency)],
      ['Marketing emails', c.marketing_consent ? `Agreed${c.consent_at ? ` on ${day(c.consent_at)}` : ''}` : 'Not agreed'],
    ];
    $('[data-summary]').innerHTML = `<dl class="ad-dl">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
    $('[data-bought]').innerHTML = c.products.length ? `<ul class="ad-tilesgrid">${c.products.map((p) => `<li>${thumb(p.sku, 64)}<span><b>${esc(p.name)}</b><small>${esc(p.qty)} bought</small></span></li>`).join('')}</ul>` : '<div class="ad-empty">Nothing bought yet.</div>';
    $('[data-orders]').innerHTML = c.orders.length ? c.orders.map((o) => `<article class="ad-order">
      <header><a href="/admin/order?id=${esc(o.id)}"><b>${esc(o.number)}</b></a><span>${day(o.placed_at)}</span>${pill(o.status)}${o.live ? '' : '<span class="ad-pill">test</span>'}<b class="ad-order__total">${money(o.total_cents, o.currency)}</b></header>
      <ul class="ad-order__items">${(o.order_items || []).map((it) => `<li>${thumb(it.sku, 44)}<span>${esc(it.qty)} × ${esc(it.name)}</span><span class="num">${money(it.amount_cents, o.currency)}</span></li>`).join('')}</ul>
      ${(o.fulfilments || []).length ? `<p class="ad-order__parcels">${o.fulfilments.map(parcelLine).join('<br>')}</p>` : ''}
    </article>`).join('') : '<div class="ad-empty">No orders.</div>';
    $('[data-notes]').value = c.notes || '';
    $('[data-save]').addEventListener('click', async () => { const { error: e } = await sb.from('customers').update({ notes: $('[data-notes]').value }).eq('id', id); msg(e ? e.message : 'Saved.', !!e); });
    $('[data-export]').addEventListener('click', async () => {
      const { data: out, error: e } = await sb.rpc('gdpr_export', { p_customer: id });
      if (e) return msg(e.message, true);
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `customer-${c.email}.json` }); a.click();
    });
    $('[data-delete]').addEventListener('click', async () => {
      if (prompt(`Type the email to delete this buyer's personal data (orders stay, anonymised):`) !== c.email) return;
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
  async '/admin/marketing'() {
    const f = $('[data-mk-form]'), frame = $('[data-mk-frame]'), say = (t, err = false) => { const m = $('[data-mk-msg]'); m.textContent = t; m.hidden = !t; m.classList.toggle('is-err', err); };
    const ERR = { subject: 'Write a subject.', text: 'Write a headline or some text.', image: 'The picture link must start with https://', imageLink: 'The picture link must start with https://', cta: 'A button needs both a text and a link.', ctaUrl: 'The button link must start with https://', agreed: 'Tick the box to confirm the people on your list agreed to get emails from Telning.', noRecipients: 'Nobody to send to. Choose who gets it.', email: 'The email service did not accept it. Try again in a minute.', auth: 'Your session has ended. Sign in again.', notReady: 'The server is not connected yet (keys missing in Vercel).', network: 'No connection. Try again.' };
    const DRAFT = 'tn-admin-campaign-draft';
    const fields = ['subject', 'preheader', 'image', 'imageAlt', 'headline', 'text', 'ctaLabel', 'ctaUrl'];
    try { const d = JSON.parse(localStorage.getItem(DRAFT) || '{}'); fields.forEach((k) => { if (d[k]) f[k].value = d[k]; }); } catch { /* no draft */ }
    const campaign = () => Object.fromEntries(fields.map((k) => [k, f[k].value.trim()]));
    const audience = () => ({ sources: $$('input[name=src]:checked', f).map((i) => i.value), pasted: f.pasted.value, pastedAgreed: f.pastedAgreed.checked });
    const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

    // live preview: the real email, from the server; pictures load from this site
    const preview = async () => {
      const c = campaign();
      $('[data-inbox-subject]').textContent = c.subject || 'Your subject';
      $('[data-inbox-pre]').textContent = c.preheader || c.headline || '';
      const n = c.subject.length; $('[data-count-subject]').textContent = n ? `${n} characters${n > 50 ? ' · shorter is better' : ''}` : 'Short is best: under 50 characters.';
      try { localStorage.setItem(DRAFT, JSON.stringify(c)); } catch { /* private window */ }
      const r = await api('/api/admin-campaign', { action: 'preview', campaign: c });
      if (r.ok) frame.srcdoc = r.html.replace(/(src="|url\()https:\/\/telning\.com\//g, '$1/');
    };
    const later = debounce(preview, 450);
    f.addEventListener('input', (e) => { if (fields.includes(e.target.name)) later(); });
    $$('[data-pw]').forEach((b) => b.addEventListener('click', () => { $$('[data-pw]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); frame.style.width = b.dataset.pw + 'px'; }));

    // the picture: upload to the email-images bucket, or paste a link
    const showPic = () => {
      const u = f.image.value.trim(), img = $('[data-pic-thumb]');
      img.hidden = !u; $('[data-pic-remove]').hidden = !u;
      if (!u) { $('[data-pic-info]').textContent = ''; return; }
      img.onload = () => { const w = img.naturalWidth, h = img.naturalHeight, el = $('[data-pic-info]'); el.classList.remove('ad-warn'); el.textContent = `${w} × ${h} px${w < 1200 ? ' · a bit small: 1200 px wide looks sharp on phones' : ''}`; };
      img.src = u;
    };
    f.image.addEventListener('change', showPic);
    $('[data-pic-remove]').addEventListener('click', () => { f.image.value = ''; showPic(); preview(); });
    $('[data-pic-file]').addEventListener('change', async (e) => {
      const file = e.target.files[0]; e.target.value = '';
      if (!file) return;
      const info = (t, err = false) => { const el = $('[data-pic-info]'); el.textContent = t; el.classList.toggle('ad-warn', err); };
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) return info('Use a JPG, PNG or GIF picture (email apps do not show WebP).', true);
      if (file.size > 2 * 1024 * 1024) return info(`The picture is ${(file.size / 1048576).toFixed(1)} MB. Make it smaller than 2 MB (best under 300 KB).`, true);
      info('Uploading…');
      const path = `${new Date().toISOString().slice(0, 7)}/${Date.now().toString(36)}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60)}`;
      const { error } = await sb.storage.from('email-images').upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
      if (error) return info(`Could not upload: ${error.message}`, true);
      f.image.value = sb.storage.from('email-images').getPublicUrl(path).data.publicUrl;
      showPic(); preview();
      if (file.size > 300 * 1024) setTimeout(() => info(`${$('[data-pic-info]').textContent} · ${Math.round(file.size / 1024)} KB: under 300 KB loads faster`), 300);
    });

    // who gets it
    let total = 0;
    const count = async () => {
      $('[data-pasted]').hidden = !f.querySelector('[data-src-pasted]').checked;
      const r = await api('/api/admin-campaign', { action: 'count', ...audience() });
      if (!r.ok) { $('[data-total]').textContent = ERR[r.error] || 'Could not count.'; return; }
      const c = r.counts; total = c.total;
      const skipped = [c.suppressed ? `${c.suppressed} unsubscribed` : '', c.invalid ? `${c.invalid} wrong address${c.invalid > 1 ? 'es' : ''}` : ''].filter(Boolean).join(', ');
      $('[data-total]').innerHTML = `Goes to <b>${esc(total)}</b> ${total === 1 ? 'person' : 'people'}${skipped ? ` · left out: ${esc(skipped)}` : ''}${r.warning === 'agreed' ? ' · <span class="ad-warn">tick the GDPR box to include your list</span>' : ''}`;
      $('[data-mk-send]').textContent = total ? `Send to ${total} ${total === 1 ? 'person' : 'people'}` : 'Send';
    };
    const countLater = debounce(count, 400);
    f.addEventListener('change', (e) => { if (['src', 'pastedAgreed'].includes(e.target.name)) count(); });
    f.pasted.addEventListener('input', countLater);
    const all = await api('/api/admin-campaign', { action: 'count', sources: ['newsletter', 'buyers'] });
    if (all.ok) { $('[data-n="newsletter"]').textContent = `${all.counts.newsletter} confirmed their email`; $('[data-n="buyers"]').textContent = `${all.counts.buyers} agreed`; }

    // test and send
    const busy = (b, on) => { b.disabled = on; if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy'); };
    $('[data-mk-test]').addEventListener('click', async (e) => {
      busy(e.target, true); say('');
      const r = await api('/api/admin-campaign', { action: 'test', campaign: campaign() });
      busy(e.target, false);
      say(r.ok ? `Test sent to ${r.to}. Check it on your phone too.` : ERR[r.error] || `Could not send (${r.error}).`, !r.ok);
    });
    $('[data-mk-send]').addEventListener('click', async (e) => {
      const c = campaign();
      if (!c.subject) return say(ERR.subject, true);
      if (!total) return say(ERR.noRecipients, true);
      if (!confirm(`Send “${c.subject}” to ${total} ${total === 1 ? 'person' : 'people'} now? This cannot be undone.`)) return;
      busy(e.target, true); say(`Sending to ${total} people… keep this page open.`);
      const r = await api('/api/admin-campaign', { action: 'send', campaign: c, ...audience() });
      busy(e.target, false);
      if (!r.ok) return say(ERR[r.error] || `Could not send (${r.error}).`, true);
      say(`Sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}.${r.failed ? ` ${r.failed} could not be sent (see the email log).` : ''}${r.skipped ? ` ${r.skipped} left out (unsubscribed or wrong address).` : ''}`, !!r.failed);
      try { localStorage.removeItem(DRAFT); } catch { /* fine */ }
      campaigns();
    });

    const campaigns = async () => {
      const { data, error } = await sb.from('campaigns').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) return;
      table($('[data-campaigns]'), [{ h: 'Sent', f: (r) => when(r.sent_at || r.created_at) }, { h: 'Subject', f: (r) => `<b>${esc(r.subject)}</b>` }, { h: 'To', f: (r) => esc((r.sources || []).map((x) => ({ newsletter: 'newsletter', buyers: 'buyers', pasted: 'pasted list' }[x] || x)).join(', ')) }, { h: 'People', num: true, f: (r) => r.recipients }, { h: 'Sent', num: true, f: (r) => r.sent }, { h: 'Failed', num: true, f: (r) => r.failed }, { h: 'Left out', num: true, f: (r) => r.skipped }, { h: 'By', f: (r) => esc(r.created_by || '') }], data, 'No marketing emails sent yet.', 'ad-table--cards');
    };
    showPic(); preview(); count(); campaigns();
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
