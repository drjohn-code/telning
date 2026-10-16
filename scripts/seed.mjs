// Seed the admin database: the product list (status live) and, with --sample, one TEST order with its items,
// fulfilments and a follow-up, so the admin pages have something to show. Needs SUPABASE_SERVICE_ROLE_KEY.
//   SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed.mjs [--sample]
import { catalog } from '../server/catalog-data.js';
import { upsert, insert, hasDb } from '../server/supabase.js';

if (!hasDb()) { console.error('No SUPABASE_SERVICE_ROLE_KEY: nothing seeded.'); process.exit(1); }
const rows = catalog.products.map((p) => ({ sku: p.sku, name: p.name, type: p.type, category: p.category, url: p.url, price_eur_cents: (p.variants ? p.variants[0].price : p.price).EUR, status: 'live' }));
rows.push(...catalog.packs.map((p) => ({ sku: p.sku, name: p.name, type: 'pack', category: 'packs', url: p.url, price_eur_cents: p.price.EUR, status: 'live' })));
const r = await upsert('products', rows, 'sku', { prefer: 'resolution=merge-duplicates,return=minimal' });
console.log('products', r.ok ? rows.length : `failed ${r.status}`);
if (process.argv.includes('--sample')) {
  const c = await upsert('customers', [{ email: 'test-customer@example.com', name: 'Test Customer', country: 'SE', marketing_consent: false }], 'email');
  const o = await upsert('orders', [{ number: 'T-SEED0001', stripe_session_id: 'cs_test_seed0001', customer_id: c.data?.[0]?.id, email: 'test-customer@example.com', name: 'Test Customer', address: { line1: 'Storgatan 1', city: 'Uppsala', postal_code: '753 20', country: 'SE' }, country: 'SE', region: 'EU', currency: 'EUR', subtotal_cents: 4180, shipping_cents: 1180, tax_cents: 0, total_cents: 5360, live: false, status: 'paid' }], 'stripe_session_id');
  const id = o.data?.[0]?.id;
  await insert('order_items', [{ order_id: id, sku: 'book-star-hoppers-3-5', name: 'The Moon or the Stars?', qty: 1, unit_cents: 1290, amount_cents: 1290, partner: 'lulu' }, { order_id: id, sku: 'poster-star-hoppers-3-5', name: 'Star Hoppers Story Wall', qty: 1, unit_cents: 2890, amount_cents: 2890, partner: 'printful' }], { prefer: 'return=minimal' });
  await upsert('fulfilments', [{ order_id: id, partner: 'lulu', status: 'manual', items: [{ sku: 'book-star-hoppers-3-5', qty: 1 }] }, { order_id: id, partner: 'printful', status: 'rejected', error: 'Sample: print file missing', items: [{ sku: 'poster-star-hoppers-3-5', qty: 1 }] }], 'order_id,partner', { prefer: 'resolution=merge-duplicates,return=minimal' });
  console.log('sample order T-SEED0001 seeded (the rejected fulfilment opens a follow-up)');
}
