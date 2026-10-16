/* Campaign offers (John, 16 Oct 2026): hidden pages /campaigns/<key> list the products of one campaign, each with a
   − / number / + stepper. 11 or more items from one campaign page get 20% off the item prices; shipping stays full
   price. Data: src/data/shop-offers.json. Pure: the caller passes the data and the catalogue in.
   The browser only says which page the items come from; the server checks that every item is on that page's list,
   counts them, checks the end date and then asks Stripe for the discount (a coupon). Not to be confused with
   server/campaigns.js, the marketing email sender. */

/** The products of each offer, section by section, from the data file and the catalogue. A section lists `skus`, or
    takes every product of its `type` whose occasion is in `occasions`. Products not on sale (soon, retired, hidden) are left out. */
export function buildOffers(data, catalog) {
  const onSale = (p) => p && !p.soon && !p.retired && !p.hidden;
  const list = Object.entries(data.offers || {}).map(([key, o]) => {
    const sections = o.sections.map((s) => {
      const products = s.skus
        ? s.skus.map((sku) => catalog.bySku.get(sku)).filter(onSale)
        : catalog.products.filter((p) => p.type === s.type && (s.occasions || []).includes(p.occasion) && onSale(p));
      return { ...s, products };
    }).filter((s) => s.products.length);
    const skus = new Set(sections.flatMap((s) => s.products.map((p) => p.sku)));
    return { ...o, key, sections, skus };
  });
  return { rule: data.rule, faq: data.faq || [], list, byKey: new Map(list.map((o) => [o.key, o])) };
}

/** True while the offer runs (until its `ends` time; a `starts` time is optional). */
export function offerOpen(offer, now = Date.now()) {
  if (offer.starts && now < Date.parse(offer.starts)) return false;
  return now <= Date.parse(offer.ends);
}

/** Check a campaign checkout: lines = resolveLines(...) output. Returns { offer, count, discount } or throws
    'offer' (unknown page), 'ended' (after the end date) or 'sku' (an item that is not on this page). */
export function offerCheck(offers, key, lines, now = Date.now()) {
  const offer = offers && offers.byKey.get(String(key));
  if (!offer) throw new Error('offer');
  if (!offerOpen(offer, now)) throw new Error('ended');
  if (!lines.every((l) => offer.skus.has(l.product.sku))) throw new Error('sku');
  const count = lines.reduce((a, l) => a + l.qty, 0);
  return { offer, count, discount: count >= offers.rule.minItems };
}

/** The Stripe coupon for the offer (one per percentage, made the first time it is needed, in test and in live mode).
    stripe(method, path, params) → { status, json }. Returns the coupon id, or null when Stripe did not answer. */
export async function ensureCoupon(stripe, rule) {
  const id = rule.coupon;
  const r = await stripe('GET', `/coupons/${encodeURIComponent(id)}`);
  if (r.status === 200 && r.json?.percent_off === rule.percent && r.json?.valid !== false) return id;
  if (r.status === 200) return null;   // a coupon with this id but another percentage, or switched off: do not guess
  if (r.status !== 404) return null;
  const c = await stripe('POST', '/coupons', { id, percent_off: rule.percent, duration: 'once', name: rule.couponName });
  if (c.status === 200) return id;
  if (c.json?.error?.code === 'resource_already_exists') return id;   // made by a checkout at the same moment
  return null;
}
