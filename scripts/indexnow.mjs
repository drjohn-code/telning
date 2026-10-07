// IndexNow: tell Bing (and the other IndexNow engines) which URLs changed. Run after a production deploy:
//   node scripts/indexnow.mjs            → submits every URL in src/data/seo.json that is in the sitemap
//   node scripts/indexnow.mjs /tada /guide → submits only those
// The key is public by design (IndexNow checks that https://telning.com/<key>.txt contains it).
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const seo = JSON.parse(readFileSync(join(ROOT, 'src/data/seo.json'), 'utf8'));
const site = JSON.parse(readFileSync(join(ROOT, 'src/data/site-data.json'), 'utf8'));
const key = site.indexNowKey;
if (!key) { console.error('indexnow: set indexNowKey in src/data/site-data.json and put public/<key>.txt in place'); process.exit(1); }

const host = new URL(seo.host).host;
const args = process.argv.slice(2);
const paths = args.length ? args : Object.entries(seo.pages).filter(([, p]) => p.sitemap !== false && !p.noindex).map(([p]) => p);
const urlList = paths.map((p) => (p === '/' ? `${seo.host}/` : `${seo.host}${p}`));

const res = await fetch('https://api.indexnow.org/IndexNow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `${seo.host}/${key}.txt`, urlList }),
});
console.log(`indexnow: ${res.status} ${res.statusText} for ${urlList.length} URL(s)`);
if (res.status >= 400) { console.error(await res.text()); process.exit(1); }
