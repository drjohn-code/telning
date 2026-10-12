/* Vercel Function (Node, Web Request/Response): POST /api/checkout — the basket → a Stripe Checkout Session.
   JSON from the basket script ({ items, currency } → { ok, url }), or a plain form post from a product page without
   JavaScript (sku, variant, qty, currency → 303 to Stripe). Environment: STRIPE_SECRET_KEY; optional STRIPE_TAX=on
   (Stripe Tax, needs the tax settings in Stripe) and STRIPE_TERMS=on (terms consent, needs the terms URL in Stripe).
   Without a key the shop answers "not open yet" and nothing is charged. Logs carry no personal data. */
import { handleCheckout } from '../server/checkout.js';
import { hasStripe, stripeApi } from '../server/stripe.js';
import { catalog, shop } from '../server/catalog-data.js';

const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

export async function POST(request) {
  const ct = request.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  let body = {};
  try {
    if (isJson) body = await request.json();
    else {
      const fd = await request.formData();
      // a pack from /organisations without JavaScript: build its choice from the fields
      const variant = fd.getAll('pack_titles').length
        ? `${fd.getAll('pack_titles').join(',')}|${fd.get('pack_tote')}~${fd.get('pack_colour')}`
        : fd.get('variant') ? String(fd.get('variant')) : undefined;
      body = { currency: String(fd.get('currency') || 'EUR'), items: [{ sku: String(fd.get('sku') || ''), variant, qty: Number(fd.get('qty') || 1) }] };
    }
  } catch { body = {}; }
  const origin = new URL(request.url).origin;
  const result = await handleCheckout({ body, origin }, {
    catalog, open: shop.open !== false,
    stripe: hasStripe() ? stripeApi : null,
    tax: process.env.STRIPE_TAX === 'on', terms: process.env.STRIPE_TERMS === 'on',
    log: (o) => console.log('checkout', JSON.stringify(o)),
  });
  if (isJson) return new Response(JSON.stringify(result.body), { status: result.status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (result.body.ok) return new Response(null, { status: 303, headers: { ...headers, Location: result.body.url } });
  return new Response(null, { status: 303, headers: { ...headers, Location: `/basket?error=${encodeURIComponent(result.body.error || 'error')}` } });
}
