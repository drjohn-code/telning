// seo-check: the per-page SEO checklist (brief section 6.10) run on the built site. Fails the build on a miss.
// - main text and links are in the HTML; one H1; title <= 60; description 140–160; canonical points to itself
// - Open Graph tags and image; JSON-LD parses and has Organization, WebSite and WebPage
// - no noindex in production, noindex on preview (Vercel VERCEL_ENV); in sitemap.xml with a lastmod
// - at least two internal links out and two in; alt text on every <img>
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const seo = JSON.parse(readFileSync(join(ROOT, 'src/data/seo.json'), 'utf8'));
const HOST = seo.host;
const env = process.env.VERCEL_ENV;
const isPreview = !!env && env !== 'production';
const sitemap = existsSync(join(DIST, 'sitemap.xml')) ? readFileSync(join(DIST, 'sitemap.xml'), 'utf8') : '';

function* htmlFiles(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (f.endsWith('.html')) yield p;
  }
}
const pagePath = (file) => {
  const rel = '/' + relative(DIST, file).replace(/\\/g, '/');
  if (rel === '/index.html') return '/';
  if (rel === '/404.html') return '/404';
  return rel.replace(/\/index\.html$/, '').replace(/\.html$/, '');
};
const attr = (html, re) => { const m = html.match(re); return m ? m[1] : ''; };
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const pages = [...htmlFiles(DIST)].map((file) => ({ file, path: pagePath(file), html: readFileSync(file, 'utf8') }));
const inbound = {};
for (const p of pages) for (const m of p.html.matchAll(/<a [^>]*href="(\/[^"#?]*)/g)) {
  const to = m[1].replace(/\/$/, '') || '/';
  if (to !== p.path) inbound[to] = (inbound[to] || 0) + 1;
}

let fails = 0;
const fail = (path, msg) => { fails++; console.error(`seo-check: ${path}  ✗ ${msg}`); };
for (const { path, html } of pages) {
  const entry = seo.pages[path];
  if (!entry) { fail(path, 'not in src/data/seo.json'); continue; }
  const title = attr(html, /<title>([^<]*)<\/title>/);
  const desc = attr(html, /<meta name="description" content="([^"]*)"/);
  const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/);
  const noindex = /<meta name="robots" content="noindex/.test(html);
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  const mainM = html.match(/<main[\s\S]*?<\/main>/);
  const main = text(mainM ? mainM[0] : '');
  const outbound = new Set([...html.matchAll(/<a [^>]*href="(\/[^"#?]*)/g)].map((m) => m[1].replace(/\/$/, '') || '/').filter((t) => t !== path));
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);

  if (!title) fail(path, 'no <title>'); else if (title.length > 60) fail(path, `title is ${title.length} characters (max 60): "${title}"`);
  if (desc.length < 140 || desc.length > 160) fail(path, `meta description is ${desc.length} characters (140–160)`);
  if (h1s !== 1) fail(path, `${h1s} H1 elements (need exactly one)`);
  const expected = path === '/' ? `${HOST}/` : `${HOST}${path}`;
  if (path !== '/404' && canonical !== expected) fail(path, `canonical "${canonical}" should be "${expected}"`);
  for (const t of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']) if (!html.includes(`property="${t}"`)) fail(path, `missing ${t}`);
  if (!html.includes('name="twitter:card"')) fail(path, 'missing twitter:card');
  const ldm = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ldm) fail(path, 'no JSON-LD'); else {
    try {
      const g = JSON.parse(ldm[1])['@graph'] || [];
      for (const t of ['Organization', 'WebSite']) if (!g.some((n) => n['@type'] === t)) fail(path, `JSON-LD has no ${t}`);
      if (!g.some((n) => /Page$/.test(String(n['@type'])))) fail(path, 'JSON-LD has no WebPage');
    } catch (e) { fail(path, `JSON-LD does not parse: ${e.message}`); }
  }
  const mustNoindex = isPreview || entry.noindex;
  if (mustNoindex && !noindex) fail(path, isPreview ? 'preview build must be noindex' : 'this page must be noindex');
  if (!mustNoindex && noindex) fail(path, 'noindex in production');
  if (entry.sitemap !== false && !entry.noindex) {
    if (!sitemap.includes(`<loc>${expected}</loc>`)) fail(path, 'not in sitemap.xml');
    if (!new RegExp(`<loc>${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc><lastmod>\\d{4}-\\d{2}-\\d{2}`).test(sitemap)) fail(path, 'no lastmod in sitemap.xml');
  } else if (sitemap.includes(`<loc>${expected}</loc>`)) fail(path, 'must not be in sitemap.xml');
  if (outbound.size < 2) fail(path, `only ${outbound.size} internal link(s) out`);
  if (path !== '/404' && (inbound[path] || 0) < 2) fail(path, `only ${inbound[path] || 0} internal link(s) in`);
  for (const img of imgs) if (!/\balt=/.test(img)) fail(path, `<img> without alt: ${img.slice(0, 80)}`);
  if (main.length < (path === '/404' ? 60 : 300)) fail(path, `main text is only ${main.length} characters in the HTML`);
}
if (fails) { console.error(`seo-check: ${fails} problem(s)`); process.exit(1); }
console.log(`seo-check: ${pages.length} page(s) pass (${isPreview ? 'preview: noindex' : 'production: indexable'})`);
