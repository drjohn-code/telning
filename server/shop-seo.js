/* SEO entries for the shop pages (title ≤ 60, description 140–160), in the same shape as src/data/seo.json pages.
   Used by src/layouts/Base.astro (through src/lib/shop.ts), scripts/seo-check.mjs and scripts/sitemap.mjs. */
import { ageLabel, GIFT_TYPES, giftPath } from './catalog.js';

const DATE = '2026-10-12';
// lengths as the HTML attribute holds them (& is &amp;), which is what search engines and seo-check read
const len = (s) => s.replace(/&/g, '&amp;').length;
const fit = (cands) => {
  for (const c of cands) if (len(c) >= 140 && len(c) <= 160) return c;
  // keep whole sentences: drop the last sentence while too long, then pad with short true lines
  const pads = [' Printed in your region.', ' Made to order.', ' Designed in Sweden.', ' By Telning.'];
  for (const c of cands) {
    let s = c;
    while (len(s) > 160 && s.lastIndexOf('. ') > 0) s = s.slice(0, s.lastIndexOf('. ') + 1);
    for (const p of pads) if (len(s) < 140 && len(s) + p.length <= 160 && !s.includes(p.trim())) s += p;
    if (len(s) >= 140 && len(s) <= 160) return s;
  }
  let s = cands[cands.length - 1];
  while (len(s) > 157) s = s.slice(0, s.lastIndexOf(' '));
  return s.replace(/[,:;]$/, '') + '…';
};

export function shopSeo(catalog, site) {
  const pages = {};
  const add = (path, e) => { pages[path] = { type: 'WebPage', published: DATE, lastmod: DATE, og: e.og || '/og/books.jpg', ...e }; };

  add('/books', { name: 'Books & Story Walls', title: 'Colouring books and Story Walls, ages 3 and up | Telning',
    description: 'Telning colouring story books and Story Walls, large 100 × 70 cm colouring pictures for the wall, sorted by series and age. Your child chooses the ending.', og: '/og/books.jpg' });
  add('/gifts', { name: 'Gifts', title: 'Gifts that keep the story going: mugs, totes, cards',
    description: 'Telning gifts for the grown-ups: Halloween cats and dogs on mugs, organic cotton tote bags, postcards and greeting cards, plus Christmas and New Year cards.', og: '/og/gifts.jpg' });
  add('/basket', { name: 'Basket', title: 'Your basket | Telning', noindex: true, sitemap: false,
    description: 'Your Telning basket: books, Story Walls and gifts, the shipping for each parcel and the total, before you pay securely with Stripe. Made for you, with care.' });
  add('/order/thanks', { name: 'Thank you', title: 'Thank you for your order | Telning', noindex: true, sitemap: false,
    description: 'Thank you for your Telning order. Every item is made for you after you order and may arrive in its own parcel. We email the tracking link when it ships.' });
  add('/organisations', { name: 'For organisations', title: 'Book packs for kindergartens, schools, libraries | Telning', og: '/og/organisations.jpg',
    description: 'Story packs for groups: 5, 10 or 40 Telning Story Walls with organic cotton tote bags and a free group guide for the teacher. Pay by card or by invoice.' });
  add('/materials', { name: 'Our materials', title: 'Our materials: paper, cotton, inks, certificates | Telning', og: '/og/materials.jpg',
    description: 'What every Telning book, Story Wall and gift is made of: premium FSC-certified paper, GOTS-certified organic cotton and OEKO-TEX fabric, with the certificates.' });
  add('/shipping-returns', { name: 'Shipping & returns', title: 'Shipping and returns | Telning', og: '/og/shipping-returns.jpg',
    description: 'Delivery times and shipping costs per region, why items may arrive in separate parcels, and how to return an unused item within 14 days or report a damaged one.' });

  for (const s of site.series) {
    const items = catalog.products.filter((p) => p.series === s.key);
    if (!items.length) continue;
    add(`/books/${s.key}`, { name: s.name, og: `/og/books-${s.key}.jpg`,
      title: len(`${s.name}: colouring books and Story Walls | Telning`) <= 60 ? `${s.name}: colouring books and Story Walls | Telning` : `${s.name}: books and Story Walls | Telning`,
      description: fit([
        `${s.name} (${s.theme.toLowerCase()}): two colouring story books for ages 3–5 and 5–7, and two Story Walls for ages 3–7 and 7+. Your child chooses the ending.`,
        `${s.name}: two colouring story books (ages 3–5 and 5–7) and two Story Walls (ages 3–7 and 7+). Your child colours the story and chooses the ending.`,
        `${s.name}: colouring story books for ages 3–5 and 5–7, and Story Walls for ages 3–7 and 7+. Your child colours and chooses the ending.`,
      ]) });
  }

  for (const p of catalog.products) {
    if (p.type === 'book') {
      const al = ageLabel(p.age);
      add(p.url, { name: p.title, parent: `/books/${p.series}`, og: `/og/p/${p.sku}.jpg`,
        title: len(`${p.title}: ${p.seriesName} colouring book, ages ${al}`) <= 60 ? `${p.title}: ${p.seriesName} colouring book, ages ${al}` : `${p.title} | ${p.seriesName} colouring book`,
        description: fit([
          `${p.book.title}: a ${p.seriesName} colouring story for ages ${al}. 14 drawings, a talk guide for the grown-up, and an empty last page for your child’s ending.`,
          `${p.book.title}: a ${p.seriesName} colouring story book for ages ${al}. 14 drawings, a talk guide for grown-ups and a last page for the ending.`,
          `${p.book.title}: ${p.seriesName} colouring book, ages ${al}. 14 drawings, a talk guide and a page for your child’s own ending.`,
        ]) });
    } else if (p.type === 'poster') {
      const al = ageLabel(p.age, 'poster');   // '3–7' or '7+'
      add(p.url, { name: `Story Wall ${al}`, parent: `/books/${p.series}`, og: `/og/p/${p.sku}.jpg`,
        title: len(`${p.seriesName} Story Wall: large colouring picture, ages ${al}`) <= 60 ? `${p.seriesName} Story Wall: large colouring picture, ages ${al}` : `${p.seriesName} Story Wall, ages ${al}`,
        description: fit([
          `The ${p.seriesBare} Story Wall, a large colouring picture for the wall, ages ${al}: 100 × 70 cm, part printed in colour, the rest for your child to finish. Then frame it.`,
          `${p.seriesName} Story Wall, ages ${al}: a large 100 × 70 cm coloring picture for the wall, a few animals painted and the rest to colour together. Frame it and hang it.`,
          `${p.seriesName} Story Wall, ages ${al}. A large colouring picture for the wall, 100 × 70 cm, part in colour, part to colour. Then frame it and hang it on the wall.`,
        ]) });
    } else {
      const noun = { mug: 'Kids’ story mug for grown-ups', tote: 'Organic cotton tote bag', postcards: 'Children’s postcards, pack of 10', cards: 'Children’s greeting cards, pack of 10 with envelopes' }[p.type];
      add(p.url, { name: p.title, parent: giftPath(p.type), og: `/og/p/${p.sku}.jpg`,
        title: p.animal ? `${p.name}, ${catalog.gifts.occasions[p.occasion] || 'Halloween'} | Telning`.slice(0, 60) : len(`${p.name} with Pim | Telning`) <= 60 ? `${p.name} with Pim | Telning` : `${p.name} | Telning`.slice(0, 60),
        description: fit([
          `${noun}: ${p.design.about} Designed in Sweden by Telning, made for you after you order.`,
          `${noun}: ${p.design.about} Designed in Sweden, made for you.`,
          `${noun}: ${p.design.about}`,
        ]) });
    }
  }
  for (const type of GIFT_TYPES) {
    const t = catalog.types[type];
    const d = {
      mug: ['Mugs for the grown-up who reads every night | Telning', 'Halloween mugs with our cats and dogs, for the grown-up who reads the story every night. White ceramic, 11 oz, dishwasher and microwave safe.'],
      tote: ['Organic cotton tote bags, undyed or black | Telning', 'Telning tote bags in GOTS-certified organic cotton: eight Halloween designs with cats and dogs, four undyed and four black, for the book and the crayons.'],
      postcards: ['Children’s postcards, packs of 10 | Telning', 'Telning postcards in packs of ten, one design per pack: cats and dogs for Halloween, Christmas and New Year on matte 300 g card with rounded corners.'],
      cards: ['Children’s greeting cards with envelopes | Telning', 'Telning greeting cards in packs of ten with envelopes, blank inside: cats and dogs for Halloween, Christmas and New Year on matte 350 g card.'],
    }[type];
    add(giftPath(type), { name: t.plural, parent: '/gifts', title: d[0], description: fit([d[1]]), og: `/og/gifts-${type}.jpg` });
  }
  return pages;
}
