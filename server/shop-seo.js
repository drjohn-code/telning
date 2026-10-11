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

  add('/books', { name: 'Books & posters', title: 'Colouring books and giant posters for ages 3–7 | Telning',
    description: 'Telning colouring story books and giant 70 × 100 cm colouring posters, sorted by series and age. Your child colours the story and chooses the ending.', og: '/og/books.jpg' });
  add('/gifts', { name: 'Gifts', title: 'Gifts that keep the story going: mugs, totes, cards',
    description: 'Telning gifts for the grown-ups: Pim mugs, organic cotton tote bags, postcards and greeting cards for birthdays and holidays. Designed in Sweden.', og: '/og/gifts.jpg' });
  add('/basket', { name: 'Basket', title: 'Your basket | Telning', noindex: true, sitemap: false,
    description: 'Your Telning basket: books, giant posters and gifts, the shipping for each parcel and the total, before you pay securely with Stripe. Printed in your region.' });
  add('/order/thanks', { name: 'Thank you', title: 'Thank you for your order | Telning', noindex: true, sitemap: false,
    description: 'Thank you for your Telning order. Each printer makes your items to order and sends its own parcel. You get an email with the tracking link when it ships.' });
  add('/organisations', { name: 'For organisations', title: 'Book packs for kindergartens, schools, libraries | Telning', og: '/og/organisations.jpg',
    description: 'Story packs for groups: 10, 30 or 50 Telning books with giant posters, tote bags and a free group guide for the teacher. Pay by card or by invoice.' });
  add('/materials', { name: 'Our materials', title: 'Our materials: paper, cotton, inks, certificates | Telning', og: '/og/materials.jpg',
    description: 'What every Telning book, poster and gift is made of: FSC paper, GOTS organic cotton, OEKO-TEX fabric and where each one is printed, with the certificates.' });
  add('/shipping-returns', { name: 'Shipping & returns', title: 'Shipping and returns | Telning', og: '/og/shipping-returns.jpg',
    description: 'Delivery times and shipping costs per region, how parcels arrive from each printer, and how to return an unused item within 14 days or report a damaged one.' });

  for (const s of site.series) {
    const items = catalog.products.filter((p) => p.series === s.key);
    if (!items.length) continue;
    add(`/books/${s.key}`, { name: s.name, og: `/og/books-${s.key}.jpg`,
      title: len(`${s.name}: colouring books and giant posters | Telning`) <= 60 ? `${s.name}: colouring books and giant posters | Telning` : `${s.name}: colouring books and posters | Telning`,
      description: fit([
        `${s.name} (${s.theme.toLowerCase()}): two colouring story books and two giant colouring posters for ages 3–5 and 5–7. Your child colours and chooses the ending.`,
        `${s.name} (${s.theme.toLowerCase()}): two colouring story books and two giant colouring posters, for ages 3–5 and 5–7. Your child chooses the ending.`,
        `${s.name}: two colouring story books and two giant colouring posters for ages 3–5 and 5–7. Your child colours the story and chooses the ending.`,
      ]) });
  }

  for (const p of catalog.products) {
    if (p.type === 'book') {
      const al = ageLabel(p.age);
      add(p.url, { name: `Colouring book ${al}`, parent: `/books/${p.series}`, og: `/og/p/${p.sku}.jpg`,
        title: `${p.seriesName} colouring book, ages ${al} | Telning`,
        description: fit([
          `${p.book.title}: a ${p.seriesName} colouring story for ages ${al}. 14 drawings, a talk guide for the grown-up, and an empty last page for your child’s ending.`,
          `${p.book.title}: a ${p.seriesName} colouring story book for ages ${al}. 14 drawings, a talk guide for grown-ups and a last page for the ending.`,
          `${p.book.title}: ${p.seriesName} colouring book, ages ${al}. 14 drawings, a talk guide and a page for your child’s own ending.`,
        ]) });
    } else if (p.type === 'poster') {
      const al = ageLabel(p.age);
      add(p.url, { name: `Giant poster ${al}`, parent: `/books/${p.series}`, og: `/og/p/${p.sku}.jpg`,
        title: len(`${p.seriesName} giant colouring poster, ages ${al} | Telning`) <= 60 ? `${p.seriesName} giant colouring poster, ages ${al} | Telning` : `${p.seriesName} colouring poster, ${al} | Telning`,
        description: fit([
          `The ${p.seriesName} giant colouring poster for ages ${al}: 70 × 100 cm, part already in colour, the rest for your child to finish. Then frame it and hang it.`,
          `${p.seriesName} giant colouring poster, ages ${al}: 70 × 100 cm, about a third in colour and the rest to colour together. Frame it and hang it on the wall.`,
          `${p.seriesName} giant colouring poster, ages ${al}. 70 × 100 cm, part in colour, part to colour. Then frame it and hang it on the wall.`,
        ]) });
    } else {
      const noun = { mug: 'Pim mug', tote: 'Organic cotton tote bag', postcards: 'Postcards, pack of 10', cards: 'Greeting cards, pack of 10 with envelopes' }[p.type];
      add(p.url, { name: p.title, parent: giftPath(p.type), og: `/og/p/${p.sku}.jpg`,
        title: len(`${p.name} | Telning`) <= 60 ? `${p.name} | Telning` : `${p.name}`.slice(0, 60),
        description: fit([
          `${noun}: ${p.design.name}. ${p.design.about} Designed in Sweden by Telning, printed to order in your region.`,
          `${noun}: ${p.design.name}. ${p.design.about} Designed in Sweden, printed in your region.`,
          `${noun}: ${p.design.name}. ${p.design.about}`,
        ]) });
    }
  }
  for (const type of GIFT_TYPES) {
    const t = catalog.types[type];
    const d = {
      mug: ['Pim mugs | Telning', 'Pim mugs for the grown-up who reads the story every night: six designs, white or with colour inside. Ceramic, dishwasher safe, printed in your region.'],
      tote: ['Organic cotton tote bags | Telning', 'Telning tote bags in GOTS certified organic cotton, natural or black: the grown-up’s bag for the book, the crayons and the library trip. Six designs.'],
      postcards: ['Postcards, packs of 10 | Telning', 'Telning postcards in packs of ten, one design per pack: birthdays, Halloween, New Year, Christmas, Easter, Midsummer and hello to Grandma.'],
      cards: ['Greeting cards with envelopes | Telning', 'Telning greeting cards in packs of ten with envelopes, blank inside: birthdays, Halloween, Christmas, New Year, Easter, thank you, new baby and love.'],
    }[type];
    add(giftPath(type), { name: t.plural, parent: '/gifts', title: d[0], description: fit([d[1]]), og: `/og/gifts-${type}.jpg` });
  }
  return pages;
}
