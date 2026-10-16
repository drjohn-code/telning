/* Shipments from the admin: the team types the carrier and tracking number of one parcel (a fulfilments row) and
   presses Save. The parcel is saved as shipped, the order moves to "shipped" when every parcel has left, and the buyer
   gets the "shipped" email with the tracking button. "Send the email again" re-sends it without changing anything.
   api/admin-ship.js wires it (after checking the caller is an admin). Logs carry no names, addresses or emails. */
import { carrierOf, cleanNumber, trackingUrl } from './carriers.js';
import { shipData } from './emails.js';

const bad = (error) => ({ status: 400, body: { ok: false, error } });
const GONE = ['shipped', 'delivered', 'cancelled'];

/**
 * body: { parcel: fulfilment id, action: 'ship' | 'resend', carrier, carrierName?, number, url?, notify? }
 * deps: { db: { select, update }, sendEmail, render, logEmail, from, contact, now?, log? }
 */
export async function handleShip(body, deps) {
  const { log = () => {} } = deps;
  const id = String(body?.parcel || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return bad('parcel');
  const resend = body.action === 'resend';

  const r = await deps.db.select('fulfilments', `id=eq.${id}&select=*,orders(id,number,email,name,address,status)`);
  const parcel = r.ok && r.data?.[0];
  if (!parcel || !parcel.orders) return { status: 404, body: { ok: false, error: 'notFound' } };
  const order = parcel.orders;
  const now = (deps.now ? deps.now() : new Date()).toISOString();

  let saved = parcel;
  if (!resend) {
    const c = carrierOf(body.carrier);
    if (!c) return bad('carrier');
    const number = cleanNumber(body.number);
    if (!number) return bad('number');
    const url = trackingUrl(c.key, number, body.url);
    if (!url) return bad('url');
    const patch = {
      status: 'shipped', carrier: c.key, carrier_name: c.key === 'other' ? String(body.carrierName || '').trim().slice(0, 60) || null : null,
      tracking_number: number, tracking_url: url, shipped_at: parcel.shipped_at || now, last_update: now, error: null,
    };
    const u = await deps.db.update('fulfilments', `id=eq.${id}`, patch, { prefer: 'return=minimal' });
    if (!u.ok) { log({ event: 'ship-db-failed', status: u.status }); return { status: 502, body: { ok: false, error: 'db' } }; }
    saved = { ...parcel, ...patch };
  } else if (!parcel.tracking_number || !parcel.tracking_url) return bad('notShipped');

  // every parcel of the order: the order is "shipped" once none is still being made
  const allR = await deps.db.select('fulfilments', `order_id=eq.${order.id}&select=id,status`);
  const all = (allR.ok && allR.data?.length ? allR.data : [saved]).map((f) => (f.id === id ? { ...f, status: saved.status } : f));
  let orderStatus = order.status;
  if (!resend && all.every((f) => GONE.includes(f.status)) && ['paid', 'making'].includes(order.status)) {
    const o = await deps.db.update('orders', `id=eq.${order.id}`, { status: 'shipped' }, { prefer: 'return=minimal' });
    if (o.ok) orderStatus = 'shipped';
  }

  // the email to the buyer
  let emailed = false, emailError = null, notifiedAt = parcel.notified_at || null;
  if ((resend || body.notify !== false) && order.email && order.email !== 'deleted@invalid') {
    const { subject, html, text } = deps.render('order-shipped', shipData(order, saved, all, deps.contact));
    try {
      const providerId = await deps.sendEmail({ to: order.email, from: deps.from, replyTo: deps.contact, subject, html, text });
      emailed = true; notifiedAt = now;
      await deps.db.update('fulfilments', `id=eq.${id}`, { notified_at: now }, { prefer: 'return=minimal' });
      await deps.logEmail({ template: 'order-shipped', to: order.email, subject, orderId: order.id, providerId: providerId || null });
    } catch (e) {
      emailError = 'email';
      log({ event: 'ship-email-failed' });
      await deps.logEmail({ template: 'order-shipped', to: order.email, subject, orderId: order.id, status: 'failed', error: String(e.message || e).slice(0, 200) });
    }
  }
  log({ event: resend ? 'ship-resend' : 'shipped', carrier: saved.carrier, emailed });
  return {
    status: 200,
    body: { ok: true, emailed, emailError, orderStatus, parcel: { id, status: saved.status, carrier: saved.carrier, carrier_name: saved.carrier_name || null, tracking_number: saved.tracking_number, tracking_url: saved.tracking_url, shipped_at: saved.shipped_at, notified_at: notifiedAt } },
  };
}
