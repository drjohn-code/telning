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

/** Image views per product type, in gallery order: the in-scene hero first, then the clean shot, a close-up, a scale
    shot and an in-use moment. Files: public/shop/img/<slug>/<slug>-<view>-<width>.{avif,webp}. */
export const VIEWS = {
  book: ['table', 'cover', 'spread', 'last-page', 'back'],
  poster: ['wall', 'progress', 'detail', 'scale', 'art'],
  mug: ['breakfast', 'white', 'detail', 'scale'],   // white mugs only (12 Oct 2026)
  tote: ['hook', 'natural', 'black', 'detail', 'bench'],
  postcards: ['desk', 'front', 'back', 'pack', 'detail'],
  cards: ['flatlay', 'front', 'open', 'pack', 'detail'],
  pack: ['pack'],
};
/** The Halloween cats-and-dogs designs (14 Oct 2026): three square photos made with scripts/catalog/generate_mockups.py
    and imported with scripts/shop/import-mockups.mjs: on the table first, then at home, then in a hand. */
export const GIFT_PHOTO_VIEWS = ['table', 'home', 'hand'];
export const viewsOf = (p) => (p.animal ? GIFT_PHOTO_VIEWS : VIEWS[p.type]);
/** Descriptive image folder and file stem per product (search engines read file names). */
export const imageSlug = (p) => ({
  book: `${p.series}-colouring-book-ages-${p.age}`,
  poster: `${p.series}-story-wall-colouring-poster-ages-${p.age}`,
  mug: p.pim === false ? `${p.key}-mug` : `${p.key}-pim-mug`, tote: `${p.key}-tote-bag`, postcards: `${p.key}-postcards`, cards: `${p.key}-greeting-cards`,
  pack: `story-${p.key}-pack`,
})[p.type];
const imagesFor = (p) => {
  const slug = imageSlug(p);
  if (p.placeholder) return [{ view: 'placeholder', src: `/shop/img/${slug}/${slug}-placeholder` }];   // no photos yet (scripts/shop/placeholders.mjs)
  return (p.animal ? GIFT_PHOTO_VIEWS : VIEWS[p.type]).map((v) => ({ view: v, src: `/shop/img/${slug}/${slug}-${v}` }));
};
export const DESCRIPTOR = {
  book: (p) => `${p.seriesName} colouring book · Ages ${ageLabel(p.age)}`,
  poster: () => 'Story Wall · 70 × 100 cm',
  mug: () => 'Ceramic mug · 330 ml',
  tote: () => 'Organic cotton tote bag · 41 × 36 cm',
  postcards: () => 'Pack of 10 · A6, FSC/PEFC-certified card',
  cards: () => 'Pack of 10 with envelopes · 14 × 14 cm',
};

export function buildCatalog({ site, shop, books, gifts }) {
  const T = shop.types;
  const seriesName = (k) => site.series.find((s) => s.key === k)?.name || k;
  const products = [];
  const retired = [];   // older designs: no page, not sold alone; kept for the organisation packs and for old orders

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
        name: book.title, short: 'Colouring book', title: book.title, descriptor: `${s.name} colouring book · Ages ${al}`,
        price: cents(T.book.price), maxQty: T.book.maxQty,
        book, theme: s.theme, colour: s.colour, print: `art/print/books/${s.key}-${age}-cover.svg (cover); interior from the illustrator`,
        images: imagesFor({ type: 'book', series: s.key, age }),
      });
      products.push({
        sku: `poster-${s.key}-${age}`, type: 'poster', category: 'books', parcel: T.poster.parcel, partner: T.poster.partner,
        series: s.key, seriesName: s.name, age,
        url: `/books/${s.key}/story-wall-${age}`, oldUrl: `/books/${s.key}/giant-poster-${age}`,
        name: `${s.name} Story Wall`, short: 'Story Wall', title: `${s.name} Story Wall`, descriptor: 'Story Wall · 70 × 100 cm',
        price: cents(T.poster.price), maxQty: T.poster.maxQty,
        poster: b.posters[age], book, theme: s.theme, colour: s.colour, print: `art/print/story-walls/${s.key}-${age}.svg`,
        images: imagesFor({ type: 'poster', series: s.key, age }),
      });
    }
  }

  for (const type of GIFT_TYPES) {
    const t = T[type];
    for (const d of gifts[type]) {
      // a design printed on one colour only (the Halloween tote bags) keeps just that colour
      const variants = t.variants ? t.variants.filter((v) => !d.colour || v.key === d.colour).map((v) => ({ key: v.key, name: v.name, price: cents(v.price || t.price) })) : null;
      const colourName = d.colour ? (t.variants || []).find((v) => v.key === d.colour)?.name : null;
      const label = { mug: `${d.name} mug`, tote: `${d.name} tote bag`, postcards: `${d.name} postcards`, cards: `${d.name} greeting cards` }[type];
      (d.retired ? retired : products).push({
        sku: `${type}-${d.key}`, type, category: 'gifts', parcel: t.parcel, partner: t.partner, retired: !!d.retired, colour: d.colour || null, colourName,
        url: `${giftPath(type)}/${d.key}`,
        name: label, short: t.tile, title: d.name, design: d, descriptor: colourName ? DESCRIPTOR[type]().replace(' · ', ` · ${colourName} · `) : DESCRIPTOR[type](),
        story: d.story ? { series: d.story, seriesName: seriesName(d.story) } : null,
        occasion: d.occasion || null, animal: d.animal || null, regions: t.regions || null,   // regions: where this type can be delivered (null = everywhere)
        soon: !!d.placeholder,   // soon: pictures still to come, not for sale yet
        price: variants ? variants[0].price : cents(t.price), variants, variantLabel: t.variantLabel, maxQty: t.maxQty,
        print: `art/print/${GIFT_PATH[type]}/${d.key}.svg`,
        images: imagesFor({ type, key: d.key, pim: !d.animal, animal: d.animal, placeholder: !!d.placeholder }),
      });
    }
  }

  // packs for organisations: books, Story Walls and tote bags at a pack price; the buyer picks the titles (each title
  // is one book, 3–5 or 5–7) and the tote design. The choice travels as the line's variant:
  // "book-<series>-<age>,book-<series>-<age>|<tote design>~<colour>". No age step: every title carries its own age.
  const packs = [];
  for (const k of (shop.packs?.items || [])) {
    packs.push({
      sku: `pack-${k.key}`, type: 'pack', category: 'packs', parcel: null, partner: 'mixed', url: '/organisations',
      name: `${k.name} pack`, short: 'Pack', title: k.name, pack: k, price: cents(k.price), maxQty: 5,
      ship: [{ parcel: 'books', per: k.books }, { parcel: 'posters', per: k.posters }, { parcel: 'totes', per: k.totes }],
      images: imagesFor({ type: 'pack', key: k.key }),
      print: 'books, posters and tote bags: see the pack choice',
    });
  }
  const bySku = new Map([...products, ...retired, ...packs].map((p) => [p.sku, p]));
  return { products, packs, retired, bySku, shop, types: T, series: site.series, gifts };
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
    if (!product || product.soon || product.retired) throw new Error('sku');   // retired designs come only inside a pack
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

/** Check a pack choice "book-…,book-…|<design>~<colour>" and return it cleaned, or null. */
export function packChoice(catalog, product, raw) {
  const parts = String(raw || '').split('|');
  if (parts.length !== 2) return null;
  const [titles, tote] = parts;
  const keys = [...new Set(titles.split(',').filter(Boolean))];
  if (!keys.length || keys.length > product.pack.titles || !keys.every((k) => /^book-[a-z-]+-\d-\d$/.test(k) && catalog.bySku.has(k))) return null;
  const [design, colour] = tote.split('~');
  const bag = catalog.bySku.get(`tote-${design}`);   // any tote in the shop, the Halloween ones too (John, 13 Oct 2026)
  if (!bag || bag.type !== 'tote' || !['natural', 'black'].includes(colour) || (bag.colour && bag.colour !== colour)) return null;
  return `${keys.join(',')}|${design}~${colour}`;
}

/** What a pack holds, for the order email: [{ sku, variant, qty, name }]. Books and posters are split evenly over the titles. */
export function packContents(catalog, product, choice) {
  const [titles, tote] = choice.split('|');
  const keys = titles.split(',');
  const [design, colour] = tote.split('~');
  const k = product.pack;
  const out = [];
  const split = (n) => keys.map((_, i) => Math.floor(n / keys.length) + (i < n % keys.length ? 1 : 0));
  split(k.books).forEach((q, i) => q && out.push({ sku: keys[i], qty: q }));
  split(k.posters).forEach((q, i) => q && out.push({ sku: keys[i].replace(/^book-/, 'poster-'), qty: q }));
  out.push({ sku: `tote-${design}`, variant: colour, qty: k.totes });
  return out.map((x) => ({ ...x, name: catalog.bySku.get(x.sku).name + (x.variant ? ` (${x.variant})` : '') }));
}

export function money(minor, currency, locale) {
  return new Intl.NumberFormat(locale || 'en-IE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(minor / 100);
}
