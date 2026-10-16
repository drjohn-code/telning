/* Vercel Function (Node, Web Request/Response): POST /api/admin-campaign — the admin marketing page (server/campaigns.js):
   preview, count the recipients, send a test to the signed-in admin, or send to everyone. Only signed-in admins: the
   page sends the Supabase access token, checked against admin_users. Environment: SUPABASE_SERVICE_ROLE_KEY,
   RESEND_API_KEY, MARKETING_FROM (sender; falls back to ORDER_FROM, then STORY_CARD_FROM). */
import { handleCampaign } from '../server/campaigns.js';
import { hasDb, select, insert, update, adminFromRequest } from '../server/supabase.js';
import { hasKey, sendEmail, sendBatch } from '../server/resend.js';
import { render } from '../server/emails.js';
import { site } from '../server/catalog-data.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const noEmail = async () => { throw new Error('no email service'); };

export async function POST(request) {
  if (!hasDb()) return json(503, { ok: false, error: 'notReady' });
  const admin = await adminFromRequest(request);
  if (!admin) return json(401, { ok: false, error: 'auth' });
  let body;
  try { body = await request.json(); } catch { return json(400, { ok: false, error: 'json' }); }
  const result = await handleCampaign(body, admin, {
    db: { select, insert, update }, render,
    sendEmail: hasKey() ? sendEmail : noEmail, sendBatch: hasKey() ? sendBatch : noEmail,
    from: process.env.MARKETING_FROM || process.env.ORDER_FROM || process.env.STORY_CARD_FROM || 'Telning <no-reply@telning.com>',
    contact: site.contactEmail,
    log: (o) => console.log('admin-campaign', JSON.stringify(o)),
  });
  return json(result.status, result.body);
}
