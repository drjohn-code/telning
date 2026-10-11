/* The shop catalogue, built from src/data/shop.json, shop-books.json, shop-gifts.json and site-data.json.
   One source for the pages (src/lib/shop.ts), the checkout function (api/checkout.js), the order webhook and the
   build checks. Pure: the caller passes the data in. Prices are kept in minor units (cents) per currency.

   Product: { sku, type, category, parcel, partner, url, name, short, price: {EUR: 1290…}, variants?, series?, age?,
              design?, images: [{ src, alt }], art } — `sku` is stable: it goes into Stripe and the order email. */

export const CURRENCIES = ['EUR', 'GBP', 'USD', 'CAD'];
export const AGES = ['3-5', '5-7'];
const cents = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v * 100)]));
export const ageLabel = (a) => a.replace('-', '–');

const GIFT_PATH = { mug: 'mugs', tote: 'tote-bags', postcards: 'postcards', cards: 'greeting-cards' };
export const GIFT_TYPES = ['mug', 'tote', 'postcards', 'cards'];
export const giftPath = (type) => `/gifts/${GIFT_PATH[type]}`;

/** Image views per product type (files in public/shop/img/<sku>/<view>-<width>.webp). */
export const VIEWS = {
  book: ['front', 'table', 'back', 'stand'],
  poster: ['art', 'wall', 'detail', 'tube'],
  mug: ['white', 'colour', 'back', 'table'],
  tote: ['natural', 'black', 'scene', 'detail'],
  postcards: ['front', 'back', 'pack', 'scene'],
  cards: ['front', 'open', 'envelope', 'scene'],
};

export function buildCatalog({ site, shop, books, gifts }) {
  const T = shop.types;
  const seriesName = (k) => site.series.find((s) => s.key === k)?.name || k;
  const products = [];

  for (const s of site.series) {
    const b = books.series[s.key];
    if (!b) continue;
    for (const age of AGES) {
      const book = b.books[age];
      const al = ageLabel(age);
      products.push({
        sku: `book-${s.key}-${age}`, type: 'book', category: 'books', parcel: T.book.parcel, partner: T.book.partner,
        series: s.key, seriesName: s.name, age,
        url: `/books/${s.key}/colouring-book-${age}`,
        name: `${s.name} colouring book, ages ${al}`, short: 'Colouring book', title: book.title,
        price: cents(T.book.price), maxQty: T.book.maxQty,
        book, theme: s.theme, colour: s.colour, print: `art/print/books/${s.key}-${age}-cover.svg (cover); interior from the illustrator`,
        images: VIEWS.book.map((v) => ({ view: v, src: `/shop/img/book-${s.key}-${age}/${v}` })),
      });
      products.push({
        sku: `poster-${s.key}-${age}`, type: 'poster', category: 'books', parcel: T.poster.parcel, partner: T.poster.partner,
        series: s.key, seriesName: s.name, age,
        url: `/books/${s.key}/giant-poster-${age}`,
        name: `${s.name} giant colouring poster, ages ${al}`, short: 'Giant colouring poster', title: `${s.name} giant poster`,
        price: cents(T.poster.price), maxQty: T.poster.maxQty,
        poster: b.posters[age], book, theme: s.theme, colour: s.colour, print: `art/print/posters/${s.key}-${age}.svg`,
        images: VIEWS.poster.map((v) => ({ view: v, src: `/shop/img/poster-${s.key}-${age}/${v}` })),
      });
    }
  }

  for (const type of GIFT_TYPES) {
    const t = T[type];
    for (const d of gifts[type]) {
      const variants = t.variants ? t.variants.map((v) => ({ key: v.key, name: v.name, price: cents(v.price || t.price) })) : null;
      const label = { mug: `Pim mug: ${d.name}`, tote: `Tote bag: ${d.name}`, postcards: `Postcards: ${d.name}`, cards: `Greeting cards: ${d.name}` }[type];
      products.push({
        sku: `${type}-${d.key}`, type, category: 'gifts', parcel: t.parcel, partner: t.partner,
        url: `${giftPath(type)}/${d.key}`,
        name: label, short: t.tile, title: d.name, design: d,
        story: d.story ? { series: d.story, seriesName: seriesName(d.story) } : null,
        occasion: d.occasion || null,
        price: variants ? variants[0].price : cents(t.price), variants, variantLabel: t.variantLabel, maxQty: t.maxQty,
        print: `art/print/${GIFT_PATH[type]}/${d.key}.svg`,
        images: VIEWS[type].map((v) => ({ view: v, src: `/shop/img/${type}-${d.key}/${v}` })),
      });
    }
  }

  // packs for organisations: books, giant posters and tote bags at a pack price; the buyer picks one age, the titles
  // and the tote design. The choice travels as the line's variant: "<age>|<series,series>|<tote design>~<colour>".
  const packs = [];
  for (const k of (shop.packs?.items || [])) {
    packs.push({
      sku: `pack-${k.key}`, type: 'pack', category: 'packs', parcel: null, partner: 'mixed', url: '/organisations',
      name: `${k.name} pack`, short: 'Pack', title: k.name, pack: k, price: cents(k.price), maxQty: 5,
      ship: [{ parcel: 'books', per: k.books }, { parcel: 'posters', per: k.posters }, { parcel: 'totes', per: k.totes }],
      images: [{ view: 'pack', src: `/shop/img/pack-${k.key}/pack` }],
      print: 'books, posters and tote bags: see the pack choice',
    });
  }
  const bySku = new Map([...products, ...packs].map((p) => [p.sku, p]));
  return { products, packs, bySku, shop, types: T, series: site.series, gifts };
}

/** Price of one line in minor units: the variant's price when it has one. */
export function unitPrice(product, variant, currency) {
  const v = product.variants && product.variants.find((x) => x.key === variant);
  return (v ? v.price : product.price)[currency];
}

/** Shipping for a basket: one parcel per printer group. lines = [{ product, qty }]. Returns minor units. */
export function shippingFor(shop, lines, currency) {
  const groups = new Map();
  for (const l of lines) {
    if (l.product.ship) for (const s of l.product.ship) groups.set(s.parcel, (groups.get(s.parcel) || 0) + s.per * l.qty);
    else groups.set(l.product.parcel, (groups.get(l.product.parcel) || 0) + l.qty);
  }
  const parcels = [];
  let total = 0;
  for (const [key, qty] of groups) {
    const p = shop.parcels[key];
    const amount = Math.round(p.first[currency] * 100) + Math.max(0, qty - 1) * Math.round(p.extra[currency] * 100);
    parcels.push({ key, name: p.name, partner: p.partner, qty, amount });
    total += amount;
  }
  return { parcels, total };
}

/** Validate a basket sent by the browser: [{ sku, variant, qty }] → [{ product, variant, qty }] or throws. */
export function resolveLines(catalog, items) {
  if (!Array.isArray(items) || !items.length || items.length > 40) throw new Error('basket');
  const out = [];
  for (const it of items) {
    const product = catalog.bySku.get(String(it && it.sku));
    if (!product) throw new Error('sku');
    const qty = Math.floor(Number(it.qty));
    if (!(qty >= 1 && qty <= product.maxQty)) throw new Error('qty');
    let variant = null;
    if (product.type === 'pack') {
      variant = packChoice(catalog, product, it.variant);
      if (!variant) throw new Error('variant');
    } else if (product.variants) {
      variant = product.variants.some((v) => v.key === it.variant) ? it.variant : null;
      if (!variant) throw new Error('variant');
    }
    out.push({ product, variant, qty });
  }
  return out;
}

/** Check a pack choice "<age>|<series,…>|<design>~<colour>" and return it cleaned, or null. */
export function packChoice(catalog, product, raw) {
  const [age, titles = '', tote = ''] = String(raw || '').split('|');
  if (!AGES.includes(age)) return null;
  const keys = [...new Set(titles.split(',').filter(Boolean))];
  if (!keys.length || keys.length > product.pack.titles || !keys.every((k) => catalog.bySku.has(`book-${k}-${age}`))) return null;
  const [design, colour] = tote.split('~');
  if (!catalog.bySku.has(`tote-${design}`) || !['natural', 'black'].includes(colour)) return null;
  return `${age}|${keys.join(',')}|${design}~${colour}`;
}

/** What a pack holds, for the order email: [{ sku, variant, qty, name }]. Books and posters are split evenly over the titles. */
export function packContents(catalog, product, choice) {
  const [age, titles, tote] = choice.split('|');
  const keys = titles.split(',');
  const [design, colour] = tote.split('~');
  const k = product.pack;
  const out = [];
  const split = (n) => keys.map((_, i) => Math.floor(n / keys.length) + (i < n % keys.length ? 1 : 0));
  split(k.books).forEach((q, i) => q && out.push({ sku: `book-${keys[i]}-${age}`, qty: q }));
  split(k.posters).forEach((q, i) => q && out.push({ sku: `poster-${keys[i]}-${age}`, qty: q }));
  out.push({ sku: `tote-${design}`, variant: colour, qty: k.totes });
  return out.map((x) => ({ ...x, name: catalog.bySku.get(x.sku).name + (x.variant ? ` (${x.variant})` : '') }));
}

export function money(minor, currency, locale) {
  return new Intl.NumberFormat(locale || 'en-IE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(minor / 100);
}
