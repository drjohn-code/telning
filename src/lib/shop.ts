/* The shop catalogue for Astro pages: the same builder as the Vercel functions (server/catalog.js). */
import site from '../data/site-data.json';
import shop from '../data/shop.json';
import books from '../data/shop-books.json';
import gifts from '../data/shop-gifts.json';
import seo from '../data/seo.json';
import { buildCatalog, money, ageLabel, giftPath, GIFT_TYPES, AGES, CURRENCIES, shippingFor } from '../../server/catalog.js';
import { shopSeo } from '../../server/shop-seo.js';

export const catalog = buildCatalog({ site, shop, books, gifts } as any);
export const shopPages: Record<string, any> = shopSeo(catalog, site);
export const allPages: Record<string, any> = { ...shopPages, ...(seo.pages as Record<string, any>) };
export { shop, books, gifts, site, money, ageLabel, giftPath, GIFT_TYPES, AGES, CURRENCIES, shippingFor };
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
  if (p.type === 'poster') return `A rainy Saturday, the ${p.seriesName} world taped to the hallway wall: your child, a friend and Grandma each take a corner. About a third is already in colour; the rest is theirs.`;
  return p.design.scene || (shop.types as any)[p.type].scene;
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
