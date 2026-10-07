// sitemap.xml from src/data/seo.json: only pages that exist in dist/, are not noindex, and are not 404 or
// coming-soon URLs. <lastmod> is the real content date from seo.json, never the build time.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const seo = JSON.parse(readFileSync(join(ROOT, 'src/data/seo.json'), 'utf8'));

const urls = [];
for (const [path, p] of Object.entries(seo.pages)) {
  if (p.sitemap === false || p.noindex) continue;
  const file = path === '/' ? join(DIST, 'index.html') : join(DIST, path.slice(1), 'index.html');
  if (!existsSync(file)) continue;                       // the page is not built yet
  const isPreview = !!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production';
  if (!isPreview && /<meta name="robots" content="noindex/.test(readFileSync(file, 'utf8'))) continue;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.lastmod || '')) throw new Error(`sitemap: ${path} needs a real lastmod (YYYY-MM-DD) in seo.json`);
  urls.push(`  <url><loc>${seo.host}${path === '/' ? '/' : path}</loc><lastmod>${p.lastmod}</lastmod></url>`);
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
writeFileSync(join(DIST, 'sitemap.xml'), xml);
console.log(`sitemap: ${urls.length} URL(s) written to dist/sitemap.xml`);
