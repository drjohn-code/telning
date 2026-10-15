/* Orders: the Stripe webhook after a payment. Pure logic; api/stripe-webhook.js wires it.
   1. Check the Stripe signature on the raw body.
   2. On a paid Checkout Session, read it back from Stripe with its line items.
   3. Split the order by printer (Lulu: books, Printful: posters, mugs, totes, Gelato: cards).
   4. Email the team one order sheet with the delivery address and, per printer, the items and print files, and email
      the customer a confirmation. Printer APIs plug in through deps.partners later (one function per printer); until a
      printer is connected, the team places that part by hand from the order sheet.
   Logs carry no names, addresses or emails. */
import { verifySignature } from './stripe.js';
import { money, packContents, countryName } from './catalog.js';

const PARTNER_NAME = { lulu: 'Lulu (books)', printful: 'Printful (posters, mugs, tote bags)', gelato: 'Gelato (postcards, greeting cards)' };

/** Turn a Stripe Checkout Session (with line_items expanded) into our order. */
export function orderFrom(session, catalog) {
  const { shop } = catalog;
  const currency = String(session.currency || 'eur').toUpperCase();
  const locale = shop.currencies[currency]?.locale || 'en-IE';
  const ship = session.collected_information?.shipping_details || session.shipping_details || {};
  const cust = session.customer_details || {};
  const ref = (sku, variant) => (shop.partnerRefs || {})[`${sku}${variant ? '~' + variant : ''}`] || (shop.partnerRefs || {})[sku] || '';
  const items = (session.line_items?.data || []).map((li) => {
    const meta = li.price?.product?.metadata || {};
    const product = catalog.bySku.get(meta.sku);
    return {
      sku: meta.sku || '?', variant: meta.variant || '', qty: li.quantity, name: li.description || product?.name || meta.sku,
      partner: product?.partner || meta.partner || 'unknown', parcel: product?.parcel || '',
      print: product?.print || '', ref: ref(meta.sku, meta.variant), amount: li.amount_total, product,
    };
  });
  // printer parts: a pack is split into its Story Walls and tote bags
  const parts = {};
  const addPart = (it) => (parts[it.partner] = parts[it.partner] || []).push(it);
  for (const it of items) {
    if (it.product?.type === 'pack' && it.variant) {
      for (const c of packContents(catalog, it.product, it.variant)) {
        const p = catalog.bySku.get(c.sku);
        addPart({ sku: c.sku, variant: c.variant || '', qty: c.qty * it.qty, name: `${c.name} (in the ${it.product.title} pack)`, partner: p.partner, parcel: p.parcel, print: p.print, ref: ref(c.sku, c.variant) });
      }
    } else addPart(it);
  }
  for (const it of items) delete it.product;
  return {
    id: session.id, number: 'T-' + String(session.id || '').slice(-8).toUpperCase(), live: !!session.livemode,
    currency, locale, total: session.amount_total, shipping: session.shipping_cost?.amount_total ?? null, tax: session.total_details?.amount_tax ?? null,
    email: cust.email || '', name: ship.name || cust.name || '', phone: cust.phone || '',
    address: ship.address || cust.address || {}, region: session.metadata?.region || '',
    items, parts,
  };
}

const addr = (a) => [a.line1, a.line2, `${a.postal_code || ''} ${a.city || ''}`.trim(), a.state, countryName(a.country)].filter(Boolean).join('\n');

export function teamText(o) {
  const m = (n) => (n === null || n === undefined ? '—' : money(n, o.currency, o.locale));
  const lines = [
    `${o.live ? 'NEW ORDER' : 'TEST ORDER (Stripe test mode, do not print)'} ${o.number}`,
    `Stripe: ${o.id}`,
    `Total ${m(o.total)} · shipping ${m(o.shipping)} · tax ${m(o.tax)} · region ${o.region}`,
    o.receipt ? `Invoice ${o.receipt.number || ''}: ${o.receipt.url}` : 'Invoice: not created by Stripe',
    '', 'Deliver to:', o.name, addr(o.address), o.phone ? `Phone: ${o.phone}` : '', o.email ? `Email: ${o.email}` : '',
  ];
  for (const [partner, items] of Object.entries(o.parts)) {
    lines.push('', `— ${PARTNER_NAME[partner] || partner}: place this part —`);
    for (const it of items) lines.push(`  ${it.qty} × ${it.name}`, `     sku ${it.sku}${it.variant ? ' / ' + it.variant : ''} · print file ${it.print || '(see art/print)'} · printer product ${it.ref || '(not set yet)'}`);
  }
  if (o.items.some((i) => i.sku.startsWith('pack-'))) lines.push('', 'PACK: send the group guide (PDF) to the customer, and the invoice details if they asked for them.');
  lines.push('', 'Each printer ships its own parcel. Send the tracking links to the customer when they come in.');
  return lines.filter((l) => l !== undefined).join('\n');
}

export function customerText(o, { contact }) {
  const first = (o.name || '').split(' ')[0];
  const parcels = Object.keys(o.parts).length;
  return [
    `Thank you${first ? ', ' + first : ''}! Your Telning order ${o.number} is in.`,
    '',
    ...o.items.map((it) => `• ${it.qty} × ${it.name}`),
    '',
    `Total paid: ${money(o.total, o.currency, o.locale)}`,
    ...(o.receipt ? [`Your receipt and invoice: ${o.receipt.url}`] : []),
    '',
    `Everything is made to order and printed near you. ${parcels > 1 ? `Your order comes in ${parcels} parcels, one from each printer.` : 'Your order comes in one parcel.'}`,
    'Delivery takes 3–10 working days in the EU and 3–7 working days in the UK, the US and Canada. We email you the tracking link when it ships.',
    '',
    'Unused items can be returned within 14 days. If something arrives damaged or wrong, reply to this email with a photo and we replace it.',
    '',
    `Questions? Reply to this email or write to ${contact}.`,
    '',
    'Pim and the Telning team',
    'Telning Publishing House · telning.com',
  ].join('\n');
}

/** The Stripe invoice made at checkout (invoice_creation): { number, url, pdf } or null. Never throws. */
export async function receiptFor(session, stripe) {
  const id = typeof session.invoice === 'string' ? session.invoice : session.invoice?.id;
  if (!id) return null;
  try {
    const r = await stripe('GET', `/invoices/${encodeURIComponent(id)}`);
    if (r.status !== 200 || !r.json?.hosted_invoice_url) return null;
    return { number: r.json.number || '', url: r.json.hosted_invoice_url, pdf: r.json.invoice_pdf || '' };
  } catch { return null; }
}

/** What the thank-you page may show: no address or phone, only what the buyer just saw at Stripe. */
export function orderSummary(order) {
  const m = (n) => (n == null ? '' : money(n, order.currency, order.locale));
  return {
    number: order.number, email: order.email, first: (order.name || '').split(' ')[0],
    items: order.items.map((it) => ({ qty: it.qty, name: it.name, amount: m(it.amount) })),
    shipping: m(order.shipping), tax: order.tax ? m(order.tax) : '', total: m(order.total),
    parcels: Object.keys(order.parts).length, receipt: order.receipt ? order.receipt.url : '',
  };
}

/**
 * GET /api/order?session_id=cs_… for the thank-you page. The session id is long and random and only the buyer has it.
 * deps: { catalog, stripe } → { status, body: { ok, paid, order? } }
 */
export async function handleOrderLookup(sessionId, deps) {
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(String(sessionId || ''))) return { status: 400, body: { ok: false, error: 'session' } };
  if (!deps.stripe) return { status: 503, body: { ok: false, error: 'notReady' } };
  const r = await deps.stripe('GET', `/checkout/sessions/${encodeURIComponent(sessionId)}`, { expand: ['line_items.data.price.product'] });
  if (r.status === 404) return { status: 404, body: { ok: false, error: 'notFound' } };
  if (r.status !== 200) return { status: 502, body: { ok: false, error: 'stripe' } };
  const paid = r.json.payment_status === 'paid' || r.json.payment_status === 'no_payment_required';
  const order = orderFrom(r.json, deps.catalog);
  order.receipt = paid ? await receiptFor(r.json, deps.stripe) : null;
  return { status: 200, body: { ok: true, paid, order: orderSummary(order) } };
}

/**
 * input: { raw, signature }
 * deps:  { secret, catalog, stripe(method, path, params), sendEmail, inbox, from, contact, partners: { lulu?, printful?, gelato? }, log,
 *          db?: { recordOrder(order), logEmail({…}) }, render?: (template, data) → { subject, html, text } }
 */
export async function handleWebhook({ raw, signature }, deps) {
  const { log = () => {} } = deps;
  if (!deps.secret) return { status: 503, body: { ok: false, error: 'notReady' } };
  if (!verifySignature(raw, signature, deps.secret)) return { status: 400, body: { ok: false, error: 'signature' } };
  let event;
  try { event = JSON.parse(raw); } catch { return { status: 400, body: { ok: false, error: 'json' } }; }
  const type = event.type;
  const s0 = event.data?.object || {};
  const paidNow = type === 'checkout.session.completed' && s0.payment_status === 'paid';
  const paidLater = type === 'checkout.session.async_payment_succeeded';
  if (!paidNow && !paidLater) { log({ event: 'ignored', type, payment: s0.payment_status || '' }); return { status: 200, body: { ok: true, ignored: true } }; }

  const r = await deps.stripe('GET', `/checkout/sessions/${encodeURIComponent(s0.id)}`, { expand: ['line_items.data.price.product'] });
  if (r.status !== 200) { log({ event: 'session-read-failed', status: r.status }); return { status: 502, body: { ok: false, error: 'stripe' } }; }
  const order = orderFrom(r.json, deps.catalog);
  order.paymentIntent = typeof r.json.payment_intent === 'string' ? r.json.payment_intent : r.json.payment_intent?.id || null;
  order.subtotal = r.json.amount_subtotal ?? null;
  order.receipt = await receiptFor(r.json, deps.stripe);
  // the database (when connected): customers, orders, items, fulfilments; a repeat of the same session is ignored
  let saved = null;
  if (deps.db) { try { saved = await deps.db.recordOrder(order); } catch (e) { log({ event: 'db-failed' }); } }
  if (saved && saved.duplicate) { log({ event: 'duplicate', number: order.number }); return { status: 200, body: { ok: true, duplicate: true } }; }

  // printers that are connected get their part now; the rest is placed by hand from the team email
  const sent = {};
  for (const [partner, items] of Object.entries(order.parts)) {
    const fn = deps.partners && deps.partners[partner];
    if (!fn) continue;
    try { sent[partner] = await fn(order, items); } catch (e) { sent[partner] = { ok: false, error: e.message }; log({ event: 'partner-failed', partner }); }
  }

  const status = Object.entries(sent).map(([p, s]) => `${p}: ${s && s.ok ? 'sent to the printer' + (s.id ? ' (' + s.id + ')' : '') : 'NOT sent: ' + (s?.error || '')}`).join('\n');
  try {
    await deps.sendEmail({ to: deps.inbox, from: deps.from, replyTo: order.email || undefined, subject: `${order.live ? 'Order' : 'TEST order'} ${order.number}: ${order.items.reduce((a, i) => a + i.qty, 0)} item(s), ${Object.keys(order.parts).length} printer(s)`, text: teamText(order) + (status ? `\n\nPrinter APIs:\n${status}` : '') });
  } catch { log({ event: 'team-email-failed' }); return { status: 500, body: { ok: false, error: 'email' } }; }
  if (order.email) {
    const subject = `Your Telning order ${order.number}`;
    const text = customerText(order, { contact: deps.contact });
    const html = deps.render ? deps.render('order-confirmation', { order, contact: deps.contact }).html : undefined;
    try {
      await deps.sendEmail({ to: order.email, from: deps.from, replyTo: deps.contact, subject, text, html });
      if (deps.db) await deps.db.logEmail({ template: 'order-confirmation', to: order.email, subject, orderId: saved?.orderId || null });
    } catch { log({ event: 'customer-email-failed' }); if (deps.db) await deps.db.logEmail({ template: 'order-confirmation', to: order.email, subject, orderId: saved?.orderId || null, status: 'failed' }); }
  }
  log({ event: 'order', live: order.live, items: order.items.length, printers: Object.keys(order.parts) });
  return { status: 200, body: { ok: true } };
}
