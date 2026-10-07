// claims-lint: fails the build when a banned claim is in the built HTML (text, titles, meta, JSON-LD).
// Source of the list: docs/telning-research-guideline.md section 4, the brief 7.8, design/BRAND.md "Never use",
// and docs/telning-claude-code-prompt.md 4.1 "Claims guard". Run: node scripts/claims-lint.mjs [dist]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = resolve(process.argv[2] || join(ROOT, 'dist'));
const site = JSON.parse(readFileSync(join(ROOT, 'src/data/site-data.json'), 'utf8'));

import { BANNED } from '../server/banned.js';

// Words allowed only on some pages: page path prefix → regex sources allowed there.
const ALLOW = { '/teachers': ['sel', 'speech therapists?'] };
// Banned everywhere except where ALLOW says: "SEL" (say "feelings and life skills").
const BANNED_UNLESS_ALLOWED = ['sel'];
// Page-specific bans: about Pim, nothing may say hand-drawn unless pim.handDrawn is true.
const QR_WORDS = ['gifts?', 'rewards?', 'prizes?', 'win', 'free'];   // brand rule 7: the QR pages are clean
const PAGE_BANS = { '/guide': QR_WORDS, '/send': QR_WORDS, ...(site.pim?.handDrawn ? {} : { '/pim': ['hand[- ]drawn', 'drawn by hand', 'illustrated by'] }) };

function* htmlFiles(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (f.endsWith('.html')) yield p;
  }
}
function textOf(html) {
  const metas = [...html.matchAll(/<meta (?:name|property)="(?:description|og:description|og:title|twitter:description|twitter:title|og:image:alt)" content="([^"]*)"/g)].map((m) => m[1]).join(' ');
  return (metas + ' ' + html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}
function pagePath(file) {
  const rel = '/' + relative(DIST, file).replace(/\\/g, '/');
  if (rel === '/index.html') return '/';
  return rel.replace(/\/index\.html$/, '').replace(/\.html$/, '');
}

let hits = 0;
for (const file of htmlFiles(DIST)) {
  const page = pagePath(file);
  const allowed = Object.entries(ALLOW).filter(([p]) => page.startsWith(p)).flatMap(([, l]) => l);
  let text = textOf(readFileSync(file, 'utf8'));
  for (const src of allowed) text = text.replace(new RegExp(`(?<![\\w-])(?:${src})(?![\\w-])`, 'gi'), ' ');
  const list = [
    ...BANNED,
    ...BANNED_UNLESS_ALLOWED.filter((w) => !allowed.includes(w)),
    ...Object.entries(PAGE_BANS).filter(([p]) => page.startsWith(p)).flatMap(([, l]) => l),
  ];
  for (const src of list) {
    const re = new RegExp(`(?<![\\w-])(?:${src})(?![\\w-])`, 'gi');
    let m;
    while ((m = re.exec(text))) {
      hits++;
      const at = Math.max(0, m.index - 50);
      console.error(`claims-lint: ${page}  "${m[0]}"  …${text.slice(at, m.index + m[0].length + 50)}…`);
    }
  }
}
if (hits) { console.error(`claims-lint: ${hits} banned phrase(s) found. See docs/telning-research-guideline.md section 4.`); process.exit(1); }
console.log('claims-lint: no banned phrases in the built HTML');
