/* Vercel Function (Node, Web Request/Response): POST /api/admin-ship — the admin order page saves a parcel's carrier and
   tracking number and the buyer gets the "shipped" email (server/shipping.js). Only signed-in admins: the page sends
   the Supabase access token, checked against admin_users. Environment: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
   ORDER_FROM (sender; falls back to STORY_CARD_FROM). */
import { handleShip } from '../server/shipping.js';
import { hasDb, select, update, logEmail, adminFromRequest } from '../server/supabase.js';
import { hasKey, sendEmail } from '../server/resend.js';
import { render } from '../server/emails.js';
import { site } from '../server/catalog-data.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

export async function POST(request) {
  if (!hasDb()) return json(503, { ok: false, error: 'notReady' });
  if (!(await adminFromRequest(request))) return json(401, { ok: false, error: 'auth' });
  let body;
  try { body = await request.json(); } catch { return json(400, { ok: false, error: 'json' }); }
  const result = await handleShip(body, {
    db: { select, update },
    sendEmail: hasKey() ? sendEmail : async () => { throw new Error('no email service'); },
    render, logEmail,
    from: process.env.ORDER_FROM || process.env.STORY_CARD_FROM || 'Telning <no-reply@telning.com>',
    contact: site.contactEmail,
    log: (o) => console.log('admin-ship', JSON.stringify(o)),
  });
  return json(result.status, result.body);
}
