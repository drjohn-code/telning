/* /shop/catalog.json: the compact catalogue the basket script needs (names, links, images, prices, parcels).
   Built at build time from the same data as the pages. */
import { catalog, shop, site, gifts } from '../../lib/shop';

export function GET() {
  const products: Record<string, unknown> = {};
  for (const p of catalog.products as any[]) {
    products[p.sku] = {
      n: p.name, u: p.url, t: p.type, pa: p.parcel, p: p.price, m: p.maxQty,
      i: p.images[0].src,
      v: p.variants ? p.variants.map((v: any) => ({ k: v.key, n: v.name, p: v.price, i: (p.images.find((im: any) => im.view === v.key) || p.images[0]).src })) : null,
    };
  }
  for (const p of (catalog as any).packs) {
    products[p.sku] = { n: p.name, u: p.url, t: 'pack', pa: null, sh: p.ship, p: p.price, m: p.maxQty, i: p.images[0].src, v: null };
  }
  const names = { series: Object.fromEntries(site.series.map((s: any) => [s.key, s.name])), totes: Object.fromEntries((gifts as any).tote.map((d: any) => [d.key, d.name])) };
  const parcels = Object.fromEntries(Object.entries(shop.parcels as Record<string, any>).map(([k, v]) => [k, { name: v.name, first: v.first, extra: v.extra }]));   // never the partner
  const books = Object.fromEntries((catalog.products as any[]).filter((p) => p.type === 'book').map((p) => [p.sku, `${p.title} (${p.age.replace('-', '–')})`]));
  const body = { currencies: shop.currencies, parcels, regions: shop.regions, products, names: { ...names, books }, open: shop.open !== false };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}
