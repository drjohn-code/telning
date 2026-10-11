/* Checkout: turns a basket from the browser into a Stripe Checkout Session. Pure logic; api/checkout.js wires it.
   Prices, names and shipping always come from the catalogue on the server, never from the browser.
   The currency sets the delivery region (EUR → EU, GBP → UK, USD → US, CAD → CA), so the shipping fee matches. */
import { resolveLines, unitPrice, shippingFor, ageLabel } from './catalog.js';

const seriesName = (catalog, key) => (catalog.series || []).find((s) => s.key === key)?.name || key;

const CURS = ['EUR', 'GBP', 'USD', 'CAD'];

export function lineName(l, catalog = {}) {
  if (l.product.type === 'pack') {
    const [age, titles, tote] = l.variant.split('|');
    return `${l.product.name}, ages ${ageLabel(age)}: ${titles.split(',').map((k) => seriesName(catalog, k)).join(', ')}; tote ${tote.replace('~', ', ')}`;
  }
  const v = l.variant && l.product.variants && l.product.variants.find((x) => x.key === l.variant);
  return v ? `${l.product.name} (${v.name})` : l.product.name;
}

/** The basket in one short string for the session metadata (Stripe allows 500 characters per value). */
export function basketCode(lines) {
  return lines.map((l) => `${l.product.sku}${l.variant ? '~' + l.variant : ''}*${l.qty}`).join('|');
}

/**
 * Stripe Checkout Session parameters.
 * opts: { origin, tax: bool (Stripe Tax on), terms: bool (terms consent on), imageBase }
 */
export function sessionParams(catalog, lines, currency, opts) {
  const { shop } = catalog;
  const cur = shop.currencies[currency];
  const region = shop.regions[cur.region];
  const ship = shippingFor(shop, lines.map((l) => ({ product: l.product, qty: l.qty })), currency);
  const taxBehavior = opts.tax ? { tax_behavior: currency === 'EUR' || currency === 'GBP' ? 'inclusive' : 'exclusive' } : {};
  const code = basketCode(lines);
  const parcelNames = ship.parcels.map((p) => p.name.toLowerCase()).join(', ');
  return {
    mode: 'payment',
    locale: 'auto',
    line_items: lines.map((l) => ({
      quantity: l.qty,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: unitPrice(l.product, l.variant, currency),
        ...taxBehavior,
        product_data: {
          name: lineName(l, catalog).slice(0, 250),
          ...(l.product.type === 'book' ? { description: `${l.product.title}. Softcover, 32 pages, ages ${ageLabel(l.product.age)}.` } : {}),
          ...(l.product.type === 'pack' ? { description: `${l.product.pack.books} books, ${l.product.pack.posters} giant poster(s), ${l.product.pack.totes} tote bag(s) and the group guide.` } : {}),
          images: [`${opts.imageBase || opts.origin}${(l.product.images.find((i) => i.view === l.variant) || l.product.images[0]).src}-600.webp`],
          metadata: { sku: l.product.sku, variant: l.variant || '', partner: l.product.partner },
        },
      },
    })),
    shipping_address_collection: { allowed_countries: region.countries },
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        display_name: `Made to order, ${ship.parcels.length} parcel${ship.parcels.length > 1 ? 's' : ''} (${parcelNames})`.slice(0, 100),
        fixed_amount: { amount: ship.total, currency: currency.toLowerCase() },
        delivery_estimate: { minimum: { unit: 'business_day', value: region.delivery[0] }, maximum: { unit: 'business_day', value: region.delivery[1] } },
        ...taxBehavior,
      },
    }],
    phone_number_collection: { enabled: true },
    billing_address_collection: 'auto',
    allow_promotion_codes: true,
    ...(opts.tax ? { automatic_tax: { enabled: true } } : {}),
    ...(opts.terms ? { consent_collection: { terms_of_service: 'required' } } : {}),
    custom_text: { submit: { message: 'Made to order and printed in your region. Each printer sends its own parcel. Unused items can be returned within 14 days.' } },
    metadata: { basket: code.slice(0, 500), currency, region: cur.region, parcels: ship.parcels.map((p) => `${p.key}:${p.qty}`).join(',') },
    payment_intent_data: { description: `Telning order: ${lines.reduce((a, l) => a + l.qty, 0)} item(s)`, metadata: { basket: code.slice(0, 500) } },
    success_url: `${opts.origin}/order/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/basket`,
  };
}

/**
 * input: { body: { items: [{ sku, variant, qty }], currency }, origin }
 * deps:  { catalog, stripe(method, path, params) | null (no key), open: bool, tax, terms, log }
 * Returns { status, body: { ok, url } | { ok: false, error } }.
 */
export async function handleCheckout({ body, origin }, deps) {
  const { catalog, stripe, log = () => {} } = deps;
  if (!deps.open) return { status: 503, body: { ok: false, error: 'closed' } };
  const currency = CURS.includes(body?.currency) ? body.currency : null;
  if (!currency) return { status: 400, body: { ok: false, error: 'currency' } };
  let lines;
  try { lines = resolveLines(catalog, body.items); } catch (e) { return { status: 400, body: { ok: false, error: e.message } }; }
  if (!stripe) return { status: 503, body: { ok: false, error: 'notReady' } };
  const params = sessionParams(catalog, lines, currency, { origin, tax: deps.tax, terms: deps.terms, imageBase: deps.imageBase });
  const r = await stripe('POST', '/checkout/sessions', params);
  if (r.status < 200 || r.status >= 300 || !r.json?.url) {
    log({ event: 'checkout-failed', status: r.status, code: r.json?.error?.code || '', message: r.json?.error?.message || '' });
    return { status: 502, body: { ok: false, error: 'stripe' } };
  }
  log({ event: 'checkout', items: lines.length, currency });
  return { status: 200, body: { ok: true, url: r.json.url } };
}
