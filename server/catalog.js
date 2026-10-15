/* The shop catalogue, built from src/data/shop.json, shop-books.json, shop-gifts.json and site-data.json.
   One source for the pages (src/lib/shop.ts), the checkout function (api/checkout.js), the order webhook and the
   build checks. Pure: the caller passes the data in. Prices are kept in minor units (cents) per currency.

   Product: { sku, type, category, parcel, partner, url, name, short, price: {EUR: 1290…}, variants?, series?, age?,
              design?, images: [{ src, alt }], art } — `sku` is stable: it goes into Stripe and the order email. */

export const CURRENCIES = ['EUR', 'GBP', 'USD', 'CAD'];
export const AGES = ['3-5', '5-7'];
/** The site's age groups (John, 15 Oct 2026): 1–3 Toddler, 3–7 Preschool, 7+ School and Adults (key young-adults). The list itself is `ages` in site-data.json;
    the home page cards and the age chips on /books and the product pages come from it. Story Walls: the sheet with the
    bigger shapes is sold for ages 3–7, the detailed sheet for ages 7 and up. The keys '3-5' and '5-7' stay in SKUs, URLs
    and image file names; only what the customer reads changes. `groups`: the age groups a Story Wall answers to. */
export const POSTER_AGES = { '3-5': { label: '3–7', min: 3, max: 7, groups: ['3-7'] }, '5-7': { label: '7+', min: 7, max: null, groups: ['7+'] } };
/** The age groups (site-data.json keys) a product answers to on the /books filter and the home page age cards. A book
    keeps its own key for now (the books are hidden; give them their groups here when they come back). */
export const ageGroupsOf = (p) => (p.type === 'poster' ? POSTER_AGES[p.age].groups : p.age ? [p.age] : []);
/** 15 Oct 2026 (John): the colouring books are not ready, so they are hidden for now. A hidden product stays in the
    catalogue (the organisation packs and the tests still know it) but has no page, no card on /books or the series
    pages, and the checkout refuses it. Set this to false to bring the books back. */
export const BOOKS_HIDDEN = true;
const cents = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v * 100)]));
/** The age as the customer reads it: '3–5' for a book, '3–7' or '7+' for a Story Wall (pass the product type). */
export const ageLabel = (a, type) => (type === 'poster' ? POSTER_AGES[a].label : a.replace('-', '–'));
/** [min, max] for the JSON-LD audience; max is null for "7+". */
export const ageRange = (p) => (p.type === 'poster' ? [POSTER_AGES[p.age].min, POSTER_AGES[p.age].max] : p.age.split('-').map(Number));

const GIFT_PATH = { mug: 'mugs', tote: 'tote-bags', postcards: 'postcards', cards: 'greeting-cards' };
export const GIFT_TYPES = ['mug', 'tote', 'postcards', 'cards'];
export const giftPath = (type) => `/gifts/${GIFT_PATH[type]}`;

/** Image views per product type, in gallery order: the in-scene hero first, then the clean shot, a close-up, a scale
    shot and an in-use moment. Files: public/shop/img/<slug>/<slug>-<view>-<width>.{avif,webp}. */
export const VIEWS = {
  book: ['table', 'cover', 'spread', 'last-page', 'back'],
  poster: ['progress', 'wall'],   // Story Walls (John, 14 Oct 2026): colouring on the floor first, then framed; no sheet or close-up
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
  cards: () => 'Pack of 10 with envelopes · 14.1 × 14.1 cm',
};

/** The print file of a gift design for the team order sheet: the art master that scripts/catalog/generate_mockups.py
    made from the design's `prompt` (theme/product/design). Masters are git-ignored and live on the studio Mac only.
    Before 15 Oct 2026 every gift pointed to an old `art/print/…svg` path that no longer exists. */
export const giftPrint = (type, d) => {
  if (!d.prompt) return `art/print/${GIFT_PATH[type]}/${d.key}.svg`;
  const [theme, product, design] = d.prompt.split('/');
  return `assets/telning-products/_art/${theme}/${product}/${design}/${theme}-${design}-${product}.png`;
};

/** The "Art style" row on a product page (John, 15 Oct 2026): every product is Scandinavian folk art, the technique follows
    the art. A gift: its design's own `artStyle`, else `artStyles[theme][type]` in shop-gifts.json (theme = the first part
    of the design's `prompt`; a plain string covers every type). A Story Wall: `types.poster.artStyle` in shop.json. */
export const artStyleOf = (gifts, type, d) => {
  if (d.artStyle) return d.artStyle;
  const s = (gifts.artStyles || {})[String(d.prompt || '').split('/')[0]];
  return (typeof s === 'string' ? s : s?.[type]) || null;
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
        series: s.key, seriesName: s.name, seriesBare: s.name.replace(/^The /, ''), age,   // seriesBare: for "the …" in text
        url: `/books/${s.key}/colouring-book-${age}`,
        name: book.title, short: 'Colouring book', title: book.title, descriptor: `${s.name} colouring book · Ages ${al}`,
        price: cents(T.book.price), maxQty: T.book.maxQty,
        book, theme: s.theme, colour: s.colour, print: `art/print/books/${s.key}-${age}-cover.svg (cover); interior from the illustrator`,
        images: imagesFor({ type: 'book', series: s.key, age }),
        hidden: BOOKS_HIDDEN,   // no page, no card, not for sale while the books are being made
      });
      products.push({
        sku: `poster-${s.key}-${age}`, type: 'poster', category: 'books', parcel: T.poster.parcel, partner: T.poster.partner,
        series: s.key, seriesName: s.name, seriesBare: s.name.replace(/^The /, ''), age,
        url: `/books/${s.key}/story-wall-${age}`, oldUrl: `/books/${s.key}/giant-poster-${age}`,
        name: `${s.name} Story Wall`, short: 'Story Wall', title: `${s.name} Story Wall`, descriptor: 'Story Wall · 70 × 100 cm',
        price: cents(T.poster.price), maxQty: T.poster.maxQty,
        poster: b.posters[age], book, theme: s.theme, colour: s.colour, print: `assets/telning-products/_story-walls/${s.key}/${s.key}-${age}-print.png`,
        artStyle: T.poster.artStyle || null,
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
        child: d.child || null,   // 'girl' or 'boy': the birthday cards (John, 15 Oct 2026), the Girls / Boys filter on /gifts
        soon: !!d.placeholder,   // soon: pictures still to come, not for sale yet
        price: variants ? variants[0].price : cents(t.price), variants, variantLabel: t.variantLabel, maxQty: t.maxQty,
        print: giftPrint(type, d), artStyle: artStyleOf(gifts, type, d),
        images: imagesFor({ type, key: d.key, pim: !d.animal, animal: d.animal, placeholder: !!d.placeholder }),
      });
    }
  }

  // packs for organisations (15 Oct 2026: Story Walls and tote bags only, the books are hidden): the buyer picks up to
  // `titles` different Story Walls (each one series and one age) and one tote design. The choice travels as the line's
  // variant: "poster-<series>-<age>,poster-<series>-<age>|<tote design>~<colour>".
  const packs = [];
  for (const k of (shop.packs?.items || [])) {
    packs.push({
      sku: `pack-${k.key}`, type: 'pack', category: 'packs', parcel: null, partner: 'mixed', url: '/organisations',
      name: `${k.name} pack`, short: 'Pack', title: k.name, pack: k, price: cents(k.price), maxQty: 5,
      ship: [{ parcel: 'books', per: k.books || 0 }, { parcel: 'posters', per: k.posters || 0 }, { parcel: 'totes', per: k.totes || 0 }].filter((s) => s.per > 0),   // no empty parcel
      images: imagesFor({ type: 'pack', key: k.key }),
      print: 'Story Walls and tote bags: see the pack choice',
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
    if (!product || product.soon || product.retired || product.hidden) throw new Error('sku');   // retired designs come only inside a pack; a hidden book is not for sale
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
  if (!keys.length || keys.length > product.pack.titles || !keys.every((k) => /^poster-[a-z-]+-\d-\d$/.test(k) && catalog.bySku.has(k) && !catalog.bySku.get(k).hidden)) return null;
  const [design, colour] = tote.split('~');
  const bag = catalog.bySku.get(`tote-${design}`);   // any tote in the shop, the Halloween ones too (John, 13 Oct 2026)
  if (!bag || bag.type !== 'tote' || !['natural', 'black'].includes(colour) || (bag.colour && bag.colour !== colour)) return null;
  return `${keys.join(',')}|${design}~${colour}`;
}

/** What a pack holds, for the order email: [{ sku, variant, qty, name }]. The Story Walls are split evenly over the chosen ones. */
export function packContents(catalog, product, choice) {
  const [titles, tote] = choice.split('|');
  const keys = titles.split(',');
  const [design, colour] = tote.split('~');
  const k = product.pack;
  const out = [];
  const split = (n) => keys.map((_, i) => Math.floor(n / keys.length) + (i < n % keys.length ? 1 : 0));
  split(k.posters).forEach((q, i) => q && out.push({ sku: keys[i], qty: q }));
  out.push({ sku: `tote-${design}`, variant: colour, qty: k.totes });
  return out.map((x) => ({ ...x, name: catalog.bySku.get(x.sku).name + (x.variant ? ` (${x.variant})` : '') }));
}

export function money(minor, currency, locale) {
  return new Intl.NumberFormat(locale || 'en-IE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(minor / 100);
}

/** "GB" → "United Kingdom" (English names for addresses in emails and on the thank-you page). */
export function countryName(code) {
  if (!code) return '';
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(String(code).toUpperCase()) || code; } catch { return code; }
}
