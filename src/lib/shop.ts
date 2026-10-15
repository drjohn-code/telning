/* The shop catalogue for Astro pages: the same builder as the Vercel functions (server/catalog.js). */
import site from '../data/site-data.json';
import shop from '../data/shop.json';
import books from '../data/shop-books.json';
import gifts from '../data/shop-gifts.json';
import seo from '../data/seo.json';
import { buildCatalog, money, ageLabel, ageRange, POSTER_AGES, ageGroupsOf, giftPath, GIFT_TYPES, AGES, CURRENCIES, shippingFor } from '../../server/catalog.js';
import { shopSeo } from '../../server/shop-seo.js';

export const catalog = buildCatalog({ site, shop, books, gifts } as any);
export const shopPages: Record<string, any> = shopSeo(catalog, site);
export const allPages: Record<string, any> = { ...shopPages, ...(seo.pages as Record<string, any>) };
export { shop, books, gifts, site, money, ageLabel, ageRange, POSTER_AGES, ageGroupsOf, giftPath, GIFT_TYPES, AGES, CURRENCIES, shippingFor };
export type Product = (typeof catalog.products)[number];

export const bySeries = (key: string) => catalog.products.filter((p: any) => p.series === key);
export const byType = (type: string) => catalog.products.filter((p: any) => p.type === type);
export const product = (sku: string) => catalog.bySku.get(sku);

/** All prices of a product as data attributes for the currency switch: data-eur="12,90 €"… (default variant). */
export function priceAttrs(p: any, variant?: string) {
  const v = p.variants && (p.variants.find((x: any) => x.key === variant) || p.variants[0]);
  const price = v ? v.price : p.price;
  const out: Record<string, string> = {};
  for (const c of CURRENCIES) out[`data-${c.toLowerCase()}`] = money(price[c], c, (shop.currencies as any)[c].locale);
  return out;
}
export const eur = (p: any) => money((p.variants ? p.variants[0].price : p.price).EUR, 'EUR', 'en-IE');

/** Breadcrumb chain for a path: [{ name, path }] from Home to the page. */
export function crumbs(path: string) {
  const chain: { name: string; path: string }[] = [];
  let p: string | undefined = path;
  while (p) {
    const e = allPages[p];
    if (!e) break;
    chain.unshift({ name: e.name, path: p });
    p = e.parent || (p.startsWith('/books/') && p.split('/').length === 3 ? '/books' : p.startsWith('/gifts/') && p.split('/').length === 3 ? '/gifts' : undefined);
  }
  return [{ name: 'Home', path: '/' }, ...chain];
}

/** Image URL for a view at a width (the photo script writes 600 and 1200; Story Wall art also 2000). */
export const img = (src: string, w = 1200) => `${src}-${w}.webp`;
/** The image path of one product view (falls back to the first photo). */
export const view = (sku: string, v: string) => { const p: any = catalog.bySku.get(sku); const im = p && (p.images.find((i: any) => i.view === v) || p.images[0]); return im ? im.src : ''; };

/** The one scene line at the top of every product page: who, where, with whom, the moment (the research formula).
    Books and Story Walls get a line built from their own story; gifts carry their own line in shop-gifts.json
    (`scene`) or fall back to the type's line. */
export function sceneLine(p: any): string {
  if (p.type === 'book') return `${p.age === '3-5' ? 'Bedtime, one page a night' : 'After school, at the kitchen table'}: your child colours ${p.book.hook.replace(/\.$/, '').charAt(0).toLowerCase()}${p.book.hook.replace(/\.$/, '').slice(1)}, you talk about it, and ${p.age === '3-5' ? 'they' : 'they'} decide how it ends.`;
  if (p.type === 'poster') return `A rainy Saturday, the ${p.seriesBare} world taped to the hallway wall: your child, a friend and Grandma each take a corner. About a third is already in colour; the rest is theirs.`;
  if (p.animal) return (GIFT_SCENE[p.occasion] || GIFT_SCENE.halloween)[p.type] || GIFT_SCENE.halloween[p.type];
  return p.design.scene || (shop.types as any)[p.type].scene;
}
/* The gift cats and dogs are not Pim scenes, one line per occasion (DRAFT: Halloween 12 Oct 2026; Christmas,
   New Year and birthday 15 Oct 2026, postcards and greeting cards only; every day 16 Oct 2026, mugs and tote bags). */
const GIFT_SCENE: Record<string, Record<string, string>> = {
  halloween: {
    mug: 'A dark October evening, cocoa in the cat-and-dog mug, while you ask which ending she chose today. For the grown-up who reads the story every night.',
    tote: 'Lantern walk on the 31st: the book, the crayons and the sweets all go in the grown-up’s bag, and the story comes along.',
    postcards: 'Sunday evening at the kitchen table: your child tells you what to write, you write it, and Grandma gets a Halloween card.',
    cards: 'A Halloween card from Grandpa, blank inside for his own words, and an envelope your child insists on licking shut.',
  },
  christmas: {
    postcards: 'A December evening at the kitchen table: your child tells you what to write, you write it, and Grandma gets a Christmas card.',
    cards: 'A Christmas card from Grandpa, blank inside for his own words, and an envelope your child insists on licking shut.',
  },
  'new-year': {
    postcards: 'The first days of January: your child says one wish for the new year, you write it, and a cousin gets a card.',
    cards: 'A New Year card for the teacher, blank inside for your own words, and an envelope your child insists on licking shut.',
  },
  everyday: {
    mug: 'Seven o’clock, the kettle on: the cat-and-dog mug comes out, and your child tells you which ending they chose last night.',
    tote: 'Library day: the book, the crayons and a snack all go in the grown-up’s bag, and the story comes along.',
  },
  birthday: {
    postcards: 'A week before the party: your child says who to invite, you write the names, and the postcards go out as invitations.',
    cards: 'A birthday card for a best friend, blank inside for your child’s own drawing, and an envelope they insist on licking shut.',
  },
};
/* The story key in shop.json types per occasion; a type without one falls back to the Halloween story. */
const GIFT_STORY: Record<string, string> = { halloween: 'storyHalloween', christmas: 'storyChristmas', 'new-year': 'storyNewYear', birthday: 'storyBirthday', everyday: 'storyEveryday' };

/** The short story after the title on a product page (DRAFT copy in shop.json): the reader can see themselves using it. */
export function storyOf(p: any): string {
  const t = (shop.types as any)[p.type];
  if (p.type === 'book') {
    const first = String(p.book.story || '').split(/(?<=\.)\s/)[0];
    return String(t.story[p.age] || t.story['3-5']).replace('{first}', first).replace('{choice}', p.book.choice || '');
  }
  if (p.type === 'poster') {
    return String(t.story).replace(/\b([Tt]he) \{series\}/, `$1 ${p.seriesBare}`).replace('{series}', p.seriesName).replace('{third}', t.storyThird[p.age] || '').replace('{theme}', String(p.theme || '').toLowerCase());
  }
  if (p.design?.storyText) return p.design.storyText;   // a design can carry its own story (design.story is the linked series)
  if (p.animal) return String(t[GIFT_STORY[p.occasion]] || t.storyHalloween || t.story).replace('{line}', p.design.line || '').replace(/\s{2,}/g, ' ');
  const words = p.design?.words ? `“${p.design.words}”` : '';
  return String(t.story).replace('{words}', words).replace(/\s{2,}/g, ' ').replace(' .', '.');
}

/** "Thu 16 – Thu 23 Oct" per currency region, from today plus the region's working days (the page shows it; the shop
    script swaps the currency). Working days skip weekends. */
export function deliveryWindow(from = new Date()): Record<string, string> {
  const add = (d: Date, n: number) => { const x = new Date(d); let k = 0; while (k < n) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0 && x.getDay() !== 6) k++; } return x; };
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const out: Record<string, string> = {};
  for (const [c, cur] of Object.entries(shop.currencies as Record<string, any>)) {
    const r = (shop.regions as any)[cur.region];
    out[c] = `${fmt(add(from, r.delivery[0]))} – ${fmt(add(from, r.delivery[1]))}`;
  }
  return out;
}
