/* Render a compiled email template with data: {{var}} placeholders (HTML-escaped), {{#list}}…{{/list}} loops, and a
   plain-text version made from the HTML. Templates: server/emails/compiled/<name>.html (built by scripts/emails/build.mjs).
   Sample data for previews and test sends: SAMPLES. Test sends go to john@telning.com only (scripts/emails/send-test.mjs). */
import { money, countryName } from './catalog.js';
import { COMPILED } from './emails/compiled.js';

const INDEX = COMPILED;
export const TEMPLATE_NAMES = Object.keys(INDEX);
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const get = (data, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);

function fill(tpl, data) {
  // loops first: {{#items}}…{{/items}}
  tpl = tpl.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => (Array.isArray(get(data, key)) ? get(data, key).map((row) => fill(inner, { ...data, ...row })).join('') : ''));
  // {{ .ConfirmationURL }} and friends are Supabase Auth variables: leave them for Supabase
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => (key.startsWith('.') ? m : (key.endsWith('_url') || key === 'address' || key.startsWith('p1_') || key.startsWith('p2_') || key === 'hero_image' || key === 'book_image' || key === 'wall_image' ? String(get(data, key) ?? '') : esc(get(data, key)))));
}
/** Plain text from the rendered HTML: body text, links as "label (url)", one blank line per block. */
export function toText(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => `${label.replace(/<[^>]+>/g, '').trim()} (${href})`)
    .replace(/<img [^>]*alt="([^"]*)"[^>]*>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|td|h\d|li)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split('\n').map((l) => l.trim()).filter((l, i, a) => l || (a[i - 1] && a[i - 1] !== '')).join('\n').trim();
}

/** render(name, data) → { subject, html, text }. Data for order emails: { order, contact } (the order from server/orders.js). */
export function render(name, data = {}) {
  const meta = INDEX[name];
  if (!meta) throw new Error(`email template "${name}" is not built`);
  const d = data.order ? { ...orderData(data.order, data.contact), ...data } : data;
  const html = fill(meta.html, d);
  const subject = fill(meta.subject, d).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return { subject, html, text: toText(html), kind: meta.kind };
}

/** The variables an order email needs, from the order object the webhook builds. */
export function orderData(o, contact = 'info@telning.com') {
  const m = (n) => (n == null ? '' : money(n, o.currency, o.locale));
  const a = o.address || {};
  return {
    number: o.number, first: (o.name || '').split(' ')[0] || 'there', contact,
    items: o.items.map((it) => ({ qty: it.qty, name: it.name, amount: m(it.amount), status: 'being made' })),
    shipping: m(o.shipping), total: m(o.total),
    address: [o.name, a.line1, a.line2, `${a.postal_code || ''} ${a.city || ''}`.trim(), a.state, countryName(a.country)].filter(Boolean).map(esc).join('<br>'),
    parcels: Object.keys(o.parts || {}).length,
    receipt: o.receipt ? [{ receipt_url: o.receipt.url }] : [],
  };
}

/** Sample data for the admin previews and test sends. */
export const SAMPLES = {
  _order: { number: 'T-7K2M9QA1', first: 'Anna', contact: 'info@telning.com', items: [{ qty: 1, name: 'The Moon or the Stars?', amount: '€12.90', status: 'being made' }, { qty: 1, name: 'Star Hoppers Story Wall', amount: '€19.90', status: 'sent to the workshop' }], shipping: '€11.80', total: '€44.60', address: 'Anna Berg<br>Storgatan 1<br>753 20 Uppsala<br>Sweden', receipt: [{ receipt_url: 'https://invoice.stripe.com/i/sample' }] },
  'order-confirmation': {}, 'order-making': {}, 'order-delivered': {}, 'review-request': {},
  'order-shipped': { items: [{ qty: 1, name: 'Star Hoppers Story Wall' }], carrier: 'PostNord', tracking_number: 'SE123456789', tracking_url: 'https://telning.com/shipping-returns', parcel_note: 'Your book travels in its own parcel and will follow in a day or two.' },
  'story-card': { child: 'Noa', age: 4, book: 'The Moon or the Stars?', ending: 'The crew lands on the moon and jumps very high.', pim_line_1: 'You chose the moon! I would have jumped too.', pim_line_2: 'Next time, let’s count the stars together.', talk_next: 'Ask: “What did the penguin see from the moon?” Then wait. Let Noa tell it first.' },
  'newsletter-confirm': { confirm_url: 'https://telning.com/api/newsletter/confirm?token=sample' },
  'newsletter-welcome': { unsubscribe_url: 'https://telning.com/api/newsletter/unsubscribe?token=sample' },
  'quote-received': { organisation: 'Lilla förskolan', wish: '30 books for two groups, ages 3–5, and 3 Story Walls. Invoice please.' },
  'invoice-sent': { organisation: 'Lilla förskolan', invoice_number: '2026-0042', email: 'rektor@example.se', items: [{ qty: 1, name: 'Story Classroom pack', amount: '€219.00' }], total: '€219.00' },
  'return-received': { what: '1 × Library Day tote bag', return_address: 'WelloWork AB, Dekangatan 4, 753 10 Uppsala, Sweden' },
  'auth-reset': { email: 'john@telning.com' }, 'auth-magic': { email: 'john@telning.com' },
  'letters-from-pim': { subject: 'The night the crew chose the moon', preheader: 'A new Story Wall, and a question for bedtime.', hero_image: 'https://telning.com/shop/img/star-hoppers-story-wall-colouring-poster-ages-3-5/star-hoppers-story-wall-colouring-poster-ages-3-5-wall-1200.webp', hero_alt: 'The Star Hoppers Story Wall on a bedroom wall', headline: 'The night the crew chose the moon', story: 'One more trip before bedtime. The penguin and the bear put on their helmets. Out of the window, the big round moon; then a shooting star. There is only time for one. In our house, the moon won, three nights in a row.', p1_image: 'https://telning.com/shop/img/star-hoppers-colouring-book-ages-3-5/star-hoppers-colouring-book-ages-3-5-table-600.webp', p1_name: 'The Moon or the Stars?', p1_line: 'Colouring book, ages 3–5.', p1_url: 'https://telning.com/books/star-hoppers/colouring-book-3-5', p1_price: '€12.90', p2_image: 'https://telning.com/shop/img/star-hoppers-story-wall-colouring-poster-ages-3-5/star-hoppers-story-wall-colouring-poster-ages-3-5-wall-600.webp', p2_name: 'Star Hoppers Story Wall', p2_line: 'Colouring poster, 70 × 100 cm.', p2_url: 'https://telning.com/books/star-hoppers/story-wall-3-5', p2_price: '€19.90', cta_url: 'https://telning.com/books/star-hoppers', cta_label: 'See Star Hoppers', pim_line: 'Which would you choose: the moon, or the stars?', unsubscribe_url: '#' },
  'series-launch': { series: 'Paws & Claws', world: 'Animals of the woods, the farm and the house: sharing space, taking turns and caring for each other.', hero_image: 'https://telning.com/shop/img/paws-claws-story-wall-colouring-poster-ages-3-5/paws-claws-story-wall-colouring-poster-ages-3-5-wall-1200.webp', book_image: 'https://telning.com/shop/img/paws-claws-colouring-book-ages-3-5/paws-claws-colouring-book-ages-3-5-table-600.webp', book_title: 'The Sunny Spot', age: '3–5', book_hook: 'One warm, sunny spot. One puppy. One cat. Who gets it?', book_url: 'https://telning.com/books/paws-claws/colouring-book-3-5', book_price: '€12.90', wall_image: 'https://telning.com/shop/img/paws-claws-story-wall-colouring-poster-ages-3-5/paws-claws-story-wall-colouring-poster-ages-3-5-wall-600.webp', wall_url: 'https://telning.com/books/paws-claws/story-wall-3-5', wall_price: '€19.90', series_url: 'https://telning.com/books/paws-claws', unsubscribe_url: '#' },
  'gift-guide': { season: 'Winter', unsubscribe_url: '#' },
  'abandoned-checkout': { first: 'Anna', items: [{ qty: 1, name: 'The Garden mug' }, { qty: 1, name: 'Hello, Grandma postcards' }], basket_url: 'https://telning.com/basket', unsubscribe_url: '#' },
};
export const sampleFor = (name) => ({ ...SAMPLES._order, ...(SAMPLES[name] || {}) });
