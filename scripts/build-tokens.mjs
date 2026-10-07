// Generates src/styles/tokens.css from design/tokens.json (the Telning design system's tokens).
import { readFileSync, writeFileSync } from 'node:fs';

const t = JSON.parse(readFileSync(new URL('../design/tokens.json', import.meta.url), 'utf8'));
const out = ['/* Telning — generated from design/tokens.json (npm run tokens). Do not edit by hand. */', ''];
for (const f of t.type.fonts) {
  out.push(`@font-face { font-family: "${f.family}"; src: url("/${f.file}") format("woff2"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`);
}
out.push('', ':root {');
for (const c of t.color.tokens) out.push(`  --${c.name}: ${c.value};`);
for (const [k, v] of Object.entries(t.type.families)) out.push(`  --font-${k}: ${v};`);
for (const fam of ['spacing', 'radius', 'shadow', 'layout', 'duration', 'easing']) {
  for (const x of t[fam].tokens) out.push(`  --${x.name}: ${x.value};`);
}
out.push('}');
writeFileSync(new URL('../src/styles/tokens.css', import.meta.url), out.join('\n') + '\n');
console.log('tokens.css written');
