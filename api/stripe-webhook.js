/* Vercel Function (Node, Web Request/Response): POST /api/stripe-webhook — Stripe calls this after a payment.
   Environment: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (from Stripe → Developers → Webhooks → this endpoint),
   RESEND_API_KEY, ORDER_INBOX (team inbox; falls back to STORY_CARD_INBOX, then site data contactEmail),
   ORDER_FROM (sender, e.g. "Telning <orders@telning.com>"; falls back to STORY_CARD_FROM).
   SUPABASE_SERVICE_ROLE_KEY (server only): writes customers, orders, items and fulfilments; without it the emails still go.
   Events to send: checkout.session.completed, checkout.session.async_payment_succeeded. */
import { handleWebhook } from '../server/orders.js';
import { stripeApi } from '../server/stripe.js';
import { hasKey, sendEmail } from '../server/resend.js';
import { catalog, site } from '../server/catalog-data.js';
import { hasDb, recordOrder, logEmail } from '../server/supabase.js';
import { render } from '../server/emails.js';

export async function POST(request) {
  const raw = await request.text();
  const result = await handleWebhook({ raw, signature: request.headers.get('stripe-signature') }, {
    secret: process.env.STRIPE_WEBHOOK_SECRET || '',
    catalog, stripe: stripeApi,
    sendEmail: hasKey() ? sendEmail : async () => { throw new Error('no email service'); },
    inbox: process.env.ORDER_INBOX || process.env.STORY_CARD_INBOX || site.contactEmail,
    from: process.env.ORDER_FROM || process.env.STORY_CARD_FROM || 'Telning <no-reply@telning.com>',
    contact: site.contactEmail,
    partners: {},
    db: hasDb() ? { recordOrder, logEmail } : null,
    render,
    log: (o) => console.log('stripe-webhook', JSON.stringify(o)),
  });
  return new Response(JSON.stringify(result.body), { status: result.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
