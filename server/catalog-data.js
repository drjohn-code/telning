/* The catalogue for Node code (Vercel functions, build scripts): the data files imported with JSON attributes. */
import site from '../src/data/site-data.json' with { type: 'json' };
import shop from '../src/data/shop.json' with { type: 'json' };
import books from '../src/data/shop-books.json' with { type: 'json' };
import gifts from '../src/data/shop-gifts.json' with { type: 'json' };
import { buildCatalog } from './catalog.js';
import { shopSeo } from './shop-seo.js';

export const catalog = buildCatalog({ site, shop, books, gifts });
export const shopPages = shopSeo(catalog, site);
export { site, shop };
