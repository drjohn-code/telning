/* Checkout: turns a basket from the browser into a Stripe Checkout Session. Pure logic; api/checkout.js wires it.
   Prices, names and shipping always come from the catalogue on the server, never from the browser.
   The currency sets the delivery region (EUR → EU, GBP → UK, USD → US, CAD → CA), so the shipping fee matches. */
import { resolveLines, unitPrice, shippingFor, ageLabel } from './catalog.js';
import { offerCheck, ensureCoupon } from './offers.js';

const seriesName = (catalog, key) => (catalog.series || []).find((s) => s.key === key)?.name || key;

const CURS = ['EUR', 'GBP', 'USD', 'CAD'];

export function lineName(l, catalog = {}) {
  if (l.product.type === 'pack') {
    const [titles, tote] = l.variant.split('|');
    const names = titles.split(',').map((sku) => { const b = catalog.bySku && catalog.bySku.get(sku); return b ? `${b.title} (${ageLabel(b.age, b.type)})` : sku; });
    const [design, colour] = tote.split('~');
    const t = catalog.bySku && catalog.bySku.get(`tote-${design}`);
    return `${l.product.name}: ${names.join(', ')}; tote ${t ? t.title : design}, ${colour === 'natural' ? 'undyed' : colour}`;
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
 * opts: { origin, tax: bool (Stripe Tax on), terms: bool (terms consent on), imageBase, marketing: bool (the buyer ticked "Letters from Pim"),
 *         offer: { key, path, coupon } when the items come from a campaign page (coupon: the 20% coupon id, only with
 *         enough items; Stripe takes either a coupon or the promo-code box, never both) }
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
          ...(l.product.type === 'pack' ? { description: `${l.product.pack.posters} Story Wall${l.product.pack.posters > 1 ? 's' : ''}, ${l.product.pack.totes} tote bag${l.product.pack.totes > 1 ? 's' : ''} and the group guide.` } : {}),
          images: [`${opts.imageBase || opts.origin}${(l.product.images.find((i) => i.view === l.variant) || l.product.images[0]).src}-600.webp`],
          metadata: { sku: l.product.sku, variant: l.variant || '', partner: l.product.partner },
        },
      },
    })),
    shipping_address_collection: { allowed_countries: region.countries },
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        display_name: `Made for you after you order · ${ship.parcels.length} parcel${ship.parcels.length > 1 ? 's' : ''} (${parcelNames})`.slice(0, 100),
        fixed_amount: { amount: ship.total, currency: currency.toLowerCase() },
        delivery_estimate: { minimum: { unit: 'business_day', value: region.delivery[0] }, maximum: { unit: 'business_day', value: region.delivery[1] } },
        ...taxBehavior,
      },
    }],
    phone_number_collection: { enabled: true },
    billing_address_collection: 'auto',
    ...(opts.offer?.coupon ? { discounts: [{ coupon: opts.offer.coupon }] } : { allow_promotion_codes: true }),
    ...(opts.tax ? { automatic_tax: { enabled: true } } : {}),
    ...(opts.terms ? { consent_collection: { terms_of_service: 'required' } } : {}),
    custom_text: { submit: { message: 'Made for you after you order. Items may arrive in separate parcels. Unused items can be returned within 14 days.' } },
    metadata: { basket: code.slice(0, 500), currency, region: cur.region, parcels: ship.parcels.map((p) => `${p.key}:${p.qty}`).join(','), ...(opts.marketing ? { marketing: 'yes' } : {}), ...(opts.offer ? { offer: opts.offer.key, discount: opts.offer.coupon ? 'yes' : 'no' } : {}) },
    // a paid Stripe invoice for every order: Stripe emails it with the receipt (live mode) and we link it in our email
    invoice_creation: { enabled: true, invoice_data: { description: 'Telning order. Made for you after you order.', footer: 'WelloWork AB · Telning Publishing House · Dekangatan 4, Uppsala, Sweden · info@telning.com', metadata: { basket: code.slice(0, 500) } } },
    payment_intent_data: { description: `Telning order: ${lines.reduce((a, l) => a + l.qty, 0)} item(s)`, metadata: { basket: code.slice(0, 500) } },
    // from a campaign page: the thank-you page clears that page's choice (not the basket), and "back" returns to the page
    success_url: `${opts.origin}/order/thanks?session_id={CHECKOUT_SESSION_ID}${opts.offer ? '&offer=' + opts.offer.key : ''}`,
    cancel_url: `${opts.origin}${opts.offer ? opts.offer.path : '/basket'}`,
  };
}

/**
 * input: { body: { items: [{ sku, variant, qty }], currency, offer?: '<campaign key>' }, origin }
 * deps:  { catalog, offers (server/offers.js), stripe(method, path, params) | null (no key), open: bool, tax, terms, log, now? }
 * Returns { status, body: { ok, url } | { ok: false, error } }.
 */
export async function handleCheckout({ body, origin }, deps) {
  const { catalog, stripe, log = () => {} } = deps;
  if (!deps.open) return { status: 503, body: { ok: false, error: 'closed' } };
  const currency = CURS.includes(body?.currency) ? body.currency : null;
  if (!currency) return { status: 400, body: { ok: false, error: 'currency' } };
  let lines;
  try { lines = resolveLines(catalog, body.items); } catch (e) { return { status: 400, body: { ok: false, error: e.message } }; }
  const region = catalog.shop.currencies[currency].region;   // postcards go to Europe and the UK only
  if (lines.some((l) => l.product.regions && !l.product.regions.includes(region))) return { status: 400, body: { ok: false, error: 'region' } };
  // a campaign page: every item must be on that page; 11 or more of them get the 20% coupon (decided here, never by the browser)
  let offer = null;
  if (body.offer !== undefined && body.offer !== null && body.offer !== '') {
    try { offer = offerCheck(deps.offers, body.offer, lines, deps.now ? deps.now() : Date.now()); } catch (e) { return { status: 400, body: { ok: false, error: e.message } }; }
  }
  if (!stripe) return { status: 503, body: { ok: false, error: 'notReady' } };
  let coupon = null;
  if (offer && offer.discount) {
    coupon = await ensureCoupon(stripe, deps.offers.rule);
    if (!coupon) { log({ event: 'coupon-failed' }); return { status: 502, body: { ok: false, error: 'stripe' } }; }
  }
  const params = sessionParams(catalog, lines, currency, { origin, tax: deps.tax, terms: deps.terms, imageBase: deps.imageBase, marketing: body.marketing === true,
    offer: offer ? { key: offer.offer.key, path: offer.offer.path, coupon } : null });
  const r = await stripe('POST', '/checkout/sessions', params);
  if (r.status < 200 || r.status >= 300 || !r.json?.url) {
    log({ event: 'checkout-failed', status: r.status, code: r.json?.error?.code || '', message: r.json?.error?.message || '' });
    return { status: 502, body: { ok: false, error: 'stripe' } };
  }
  log({ event: 'checkout', items: lines.length, currency, ...(offer ? { offer: offer.offer.key, count: offer.count, discount: !!coupon } : {}) });
  return { status: 200, body: { ok: true, url: r.json.url } };
}
