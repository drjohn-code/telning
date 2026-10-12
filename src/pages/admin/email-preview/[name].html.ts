/* /admin/email-preview/<template>.html — every email template rendered with sample data, for the admin previews.
   Static, noindex (vercel.json adds X-Robots-Tag for /admin/*). */
import { render, TEMPLATE_NAMES, sampleFor } from '../../../../server/emails.js';
export function getStaticPaths() { return TEMPLATE_NAMES.map((name) => ({ params: { name } })); }
export function GET({ params }: { params: { name: string } }) {
  const { html } = render(params.name, sampleFor(params.name));
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}
