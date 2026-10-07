// legal-check: a production build (Vercel VERCEL_ENV=production) fails while a legal placeholder is empty, so no
// page ever goes live saying "to be added". Previews and local builds only warn. Run: node scripts/legal-check.mjs
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const site = JSON.parse(readFileSync(join(ROOT, 'src/data/site-data.json'), 'utf8'));
const missing = [];
if (!site.legal?.orgNumber) missing.push('legal.orgNumber (company number)');
if (!site.legal?.address) missing.push('legal.address');
if (!site.contactEmail) missing.push('contactEmail');
if (!site.storyCard?.emailService) missing.push('storyCard.emailService (named in the privacy notices)');
if (!site.storyCard?.inbox) missing.push('storyCard.inbox (the team inbox for story cards)');
const prod = process.env.VERCEL_ENV === 'production';
if (missing.length) {
  console[prod ? 'error' : 'warn'](`legal-check: ${prod ? 'PRODUCTION BUILD STOPPED' : 'warning'}: empty placeholders in site-data.json: ${missing.join(', ')}`);
  if (prod) process.exit(1);
} else console.log('legal-check: all legal placeholders are set');
