/* /admin/email-preview/<template>.html — every email template rendered with sample data, for the admin previews.
   Static, noindex (vercel.json adds X-Robots-Tag for /admin/*). Pictures and fonts load from this build, so a preview
   shows new email images before they are live on telning.com. */
import { render, TEMPLATE_NAMES, sampleFor } from '../../../../server/emails.js';
export function getStaticPaths() { return TEMPLATE_NAMES.map((name) => ({ params: { name } })); }
export function GET({ params }: { params: { name: string } }) {
  const html = render(params.name, sampleFor(params.name)).html.replace(/(src="|url\()https:\/\/telning\.com\//g, '$1/');
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}
