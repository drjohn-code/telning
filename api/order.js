/* Vercel Function (Node, Web Request/Response): GET /api/order?session_id=cs_… — the order summary for /order/thanks.
   Only the buyer has the session id (Stripe puts it in the return URL). No address or phone in the answer, nothing logged. */
import { handleOrderLookup } from '../server/orders.js';
import { hasStripe, stripeApi } from '../server/stripe.js';
import { catalog } from '../server/catalog-data.js';

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('session_id');
  const result = await handleOrderLookup(id, { catalog, stripe: hasStripe() ? stripeApi : null });
  return new Response(JSON.stringify(result.body), { status: result.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
