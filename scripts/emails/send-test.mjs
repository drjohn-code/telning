// Send one or every template with sample data to john@telning.com ONLY (the address is fixed here on purpose).
//   RESEND_API_KEY=… node scripts/emails/send-test.mjs [template-name|all]
import { render, TEMPLATE_NAMES, sampleFor } from '../../server/emails.js';
import { sendEmail, hasKey } from '../../server/resend.js';

const TO = 'john@telning.com';
const FROM = process.env.ORDER_FROM || process.env.STORY_CARD_FROM || 'Telning <no-reply@telning.com>';
const which = process.argv[2] || 'all';
const names = which === 'all' ? TEMPLATE_NAMES : [which];
if (!hasKey()) { console.error('No RESEND_API_KEY: nothing sent. Preview the templates at /admin/emails instead.'); process.exit(1); }
for (const n of names) {
  const { subject, html, text } = render(n, sampleFor(n));
  const id = await sendEmail({ to: TO, from: FROM, subject: `[TEST ${n}] ${subject}`, html, text });
  console.log(n, '→', TO, id || 'sent');
}
