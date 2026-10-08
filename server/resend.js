/* Small Resend helpers shared by the Vercel functions (api/story-card.js, api/subscribe.js).
   Key: RESEND_API_KEY. Contacts and segments need a "Full access" key; a "Sending access" key can only send email
   (Resend answers 401 restricted_api_key on the contacts endpoints). Nothing here logs addresses or bodies. */
const API = 'https://api.resend.com';

export const hasKey = () => !!process.env.RESEND_API_KEY;

/** One Resend API call. Returns { status, json } and never throws on HTTP errors. */
export async function resendApi(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json };
}

/** Send one email. attachments: [{ filename, content: Buffer }]. Throws when Resend refuses. */
export async function sendEmail({ to, from, replyTo, subject, text, attachments = [] }) {
  if (!hasKey()) throw new Error('no email service');
  const r = await resendApi('POST', '/emails', {
    from, to: [to], ...(replyTo ? { reply_to: replyTo } : {}), subject, text,
    ...(attachments.length ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content.toString('base64') })) } : {}),
  });
  if (r.status < 200 || r.status >= 300) throw new Error(`email ${r.status}`);
}
