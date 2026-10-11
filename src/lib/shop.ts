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

/** Image URL for a view at a width (the photo script writes 600 and 1200; posters' art also 2000). */
export const img = (src: string, w = 1200) => `${src}-${w}.webp`;
