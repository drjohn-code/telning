/* Render a compiled email template with data: {{var}} placeholders (HTML-escaped), {{#list}}…{{/list}} loops, and a
   plain-text version made from the HTML. Templates: server/emails/compiled/<name>.html (built by scripts/emails/build.mjs).
   Sample data for previews and test sends: SAMPLES. Test sends go to john@telning.com only (scripts/emails/send-test.mjs). */
import { money, countryName, DESCRIPTOR } from './catalog.js';
import { catalog, offers } from './catalog-data.js';
import { COMPILED } from './emails/compiled.js';
import { THUMBS } from './emails/thumbs.js';
import { carrierOf } from './carriers.js';

/** The templates the code really sends, with when (shown in /admin/emails). tests/emails.test.mjs checks this list
    against the code, so a template is only listed here once something sends it. */
export const SENT_BY_CODE = {
  'order-confirmation': 'after a payment',
  'order-shipped': 'when you save tracking on an order',
  'newsletter-confirm': 'when someone signs up',
  'newsletter-welcome': 'after they confirm their email',
  campaign: 'when you send from Marketing email',
};
/** Supabase Auth sends these itself, only after they are pasted into Supabase → Authentication → Email templates. */
export const SUPABASE_EMAILS = ['auth-reset', 'auth-magic'];
const INDEX = COMPILED;
export const TEMPLATE_NAMES = Object.keys(INDEX);
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const get = (data, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);

function fill(tpl, data) {
  // sections first: {{#items}}…{{/items}} repeats for a list, shows once for any other true value; {{^key}}…{{/key}} shows when empty
  tpl = tpl.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => {
    const v = get(data, key);
    if (Array.isArray(v)) return v.map((row) => fill(inner, { ...data, ...row })).join('');
    return v ? fill(inner, data) : '';
  });
  tpl = tpl.replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => { const v = get(data, key); return !v || (Array.isArray(v) && !v.length) ? fill(inner, data) : ''; });
  // {{ .ConfirmationURL }} and friends are Supabase Auth variables: leave them for Supabase
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    if (key.startsWith('.')) return m;
    const v = get(data, key);
    if (key.endsWith('_url')) return String(v ?? '').replace(/&(?!amp;)/g, '&amp;').replace(/"/g, '%22').replace(/</g, '%3C').replace(/>/g, '%3E');   // links: safe in href=""
    return key === 'address' || key.endsWith('_html') || key.startsWith('p1_') || key.startsWith('p2_') || key === 'hero_image' || key === 'book_image' || key === 'wall_image' ? String(v ?? '') : esc(v);
  });
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

/** The square product photo for an order line (public/email/products/<sku>.jpg, made by scripts/emails/assets.mjs). */
export const thumbFor = (sku) => (THUMBS.has(sku) ? `https://telning.com/email/products/${sku}.jpg` : '');
/** The small grey line under an item name, e.g. "Story Wall · 70 × 100 cm". */
function lineFor(sku) {
  const p = catalog.bySku.get(sku);
  if (!p) return '';
  if (p.type === 'pack') return 'Story pack for groups';
  return DESCRIPTOR[p.type] ? DESCRIPTOR[p.type](p) : '';
}
export const itemData = (it, m = (n) => n) => ({ qty: it.qty, name: it.name, amount: m(it.amount), status: 'being made', image: thumbFor(it.sku), thumb: !!thumbFor(it.sku), line: lineFor(it.sku) });

/** The variables an order email needs, from the order object the webhook builds. */
export function orderData(o, contact = 'info@telning.com') {
  const m = (n) => (n == null ? '' : money(n, o.currency, o.locale));
  const a = o.address || {};
  const subtotal = o.subtotal ?? o.items.reduce((s, it) => s + (it.amount || 0), 0);
  const parcels = Object.keys(o.parts || {}).length;
  const discount = o.discount || 0;   // a promo code or the 20% of a campaign page: Stripe's subtotal is before it
  // Stripe Tax: prices in the EU include VAT (subtotal − discount + shipping = total); elsewhere it can be added on top
  const vatIncluded = o.tax ? subtotal - discount + (o.shipping || 0) >= o.total : false;
  const created = o.created ? new Date(o.created * 1000) : new Date();
  return {
    number: o.number, first: (o.name || '').split(' ')[0] || 'there', contact,
    date: created.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Stockholm' }),
    items: o.items.map((it) => itemData(it, m)),
    subtotal: m(subtotal), shipping: m(o.shipping), total: m(o.total),
    discount: discount > 0, discount_amount: `−${m(discount)}`, discount_label: o.offer ? `Discount (${offers.rule.percent}% for ${offers.rule.minItems} or more items)` : 'Discount',
    vat: !!o.tax, vat_label: vatIncluded ? 'VAT (included)' : 'VAT', vat_amount: m(o.tax),
    address: [o.name, a.line1, a.line2, `${a.postal_code || ''} ${a.city || ''}`.trim(), a.state, countryName(a.country)].filter(Boolean).map(esc).join('<br>'),
    parcels,
    parcel_line: parcels > 1 ? `Your order comes in ${parcels} parcels. You get an email with a tracking link for each one.` : 'You get an email with the tracking link when your parcel ships.',
    receipt: o.receipt ? [{ receipt_url: o.receipt.url }] : [],
  };
}

/** The variables of the "shipped" email, from database rows: the order, this parcel (a fulfilments row with carrier,
    tracking_number, tracking_url and items) and all parcels of the order (to say how many are still to come). */
export function shipData(order, parcel, all = [parcel], contact = 'info@telning.com') {
  const a = order.address || {};
  const c = carrierOf(parcel.carrier);
  const known = c && c.key !== 'other';
  const left = all.filter((f) => f.id !== parcel.id && !['shipped', 'delivered', 'cancelled'].includes(f.status)).length;
  const live = all.filter((f) => f.status !== 'cancelled').length;
  return {
    number: order.number, first: (order.name || '').split(' ')[0] || 'there', contact,
    carrier: known ? c.name : parcel.carrier_name || 'Other', tracking_number: parcel.tracking_number, tracking_url: parcel.tracking_url,
    track_label: known ? `Track with ${c.name}` : 'Track your parcel',
    items: (parcel.items || []).map((it) => itemData(it)),
    parcel_note: live <= 1 ? 'This parcel is your whole order.' : left ? `The rest of your order comes in ${left} more parcel${left > 1 ? 's' : ''}. You get an email for each one.` : 'This is the last parcel of your order.',
    address: [order.name, a.line1, a.line2, `${a.postal_code || ''} ${a.city || ''}`.trim(), a.state, countryName(a.country)].filter(Boolean).map(esc).join('<br>'),
  };
}

/** Sample data for the admin previews and test sends. */
export const SAMPLES = {
  _order: { number: 'T-7K2M9QA1', first: 'Anna', contact: 'info@telning.com', date: '16 October 2026', items: [itemData({ qty: 1, name: 'Star Hoppers Story Wall', amount: '€19.90', sku: 'poster-star-hoppers-3-5' }), itemData({ qty: 2, name: 'Cocoa Cat mug', amount: '€31.80', sku: 'mug-cocoa-cat' }), itemData({ qty: 1, name: 'Moon Cat tote bag (Undyed)', amount: '€18.90', sku: 'tote-moon-cat' })], subtotal: '€70.60', shipping: '€11.80', total: '€82.40', vat: true, vat_label: 'VAT (included)', vat_amount: '€16.48', address: 'Anna Berg<br>Storgatan 1<br>753 20 Uppsala<br>Sweden', parcels: 2, parcel_line: 'Your order comes in 2 parcels. You get an email with a tracking link for each one.', receipt: [{ receipt_url: 'https://invoice.stripe.com/i/sample' }] },
  'order-confirmation': {}, 'order-making': {}, 'order-delivered': {}, 'review-request': {},
  'order-shipped': { items: [itemData({ qty: 1, name: 'Star Hoppers Story Wall', sku: 'poster-star-hoppers-3-5' }), itemData({ qty: 2, name: 'Cocoa Cat mug', sku: 'mug-cocoa-cat' })], carrier: 'PostNord', tracking_number: '00340434161094042557', tracking_url: 'https://tracking.postnord.com/en/tracking?id=00340434161094042557', track_label: 'Track with PostNord', parcel_note: 'The rest of your order comes in 1 more parcel. You get an email for each one.' },
  'story-card': { child: 'Noa', age: 4, book: 'The Moon or the Stars?', ending: 'The crew lands on the moon and jumps very high.', pim_line_1: 'You chose the moon! I would have jumped too.', pim_line_2: 'Next time, let’s count the stars together.', talk_next: 'Ask: “What did the penguin see from the moon?” Then wait. Let Noa tell it first.' },
  'newsletter-confirm': { confirm_url: 'https://telning.com/api/newsletter/confirm?token=sample' },
  'newsletter-welcome': { unsubscribe_url: 'https://telning.com/api/newsletter/unsubscribe?token=sample' },
  'quote-received': { organisation: 'Lilla förskolan', wish: '30 books for two groups, ages 3–5, and 3 Story Walls. Invoice please.' },
  'invoice-sent': { organisation: 'Lilla förskolan', invoice_number: '2026-0042', email: 'rektor@example.se', items: [{ qty: 1, name: 'Story Classroom pack', amount: '€219.00' }], total: '€219.00' },
  'return-received': { what: '1 × Library Day tote bag', return_address: 'WelloWork AB, Dekangatan 4, 753 10 Uppsala, Sweden' },
  'auth-reset': { email: 'john@telning.com' }, 'auth-magic': { email: 'john@telning.com' },
  'letters-from-pim': { subject: 'The night the crew chose the moon', preheader: 'A new Story Wall, and a question for bedtime.', hero_image: 'https://telning.com/shop/img/star-hoppers-story-wall-colouring-poster-ages-3-7/star-hoppers-story-wall-colouring-poster-ages-3-7-wall-1200.webp', hero_alt: 'The Star Hoppers Story Wall on a bedroom wall', headline: 'The night the crew chose the moon', story: 'One more trip before bedtime. The penguin and the bear put on their helmets. Out of the window, the big round moon; then a shooting star. There is only time for one. In our house, the moon won, three nights in a row.', p1_image: 'https://telning.com/shop/img/star-hoppers-colouring-book-ages-3-5/star-hoppers-colouring-book-ages-3-5-table-600.webp', p1_name: 'The Moon or the Stars?', p1_line: 'Colouring book, ages 3–5.', p1_url: 'https://telning.com/books/star-hoppers/colouring-book-3-5', p1_price: '€12.90', p2_image: 'https://telning.com/shop/img/star-hoppers-story-wall-colouring-poster-ages-3-7/star-hoppers-story-wall-colouring-poster-ages-3-7-wall-600.webp', p2_name: 'Star Hoppers Story Wall', p2_line: 'Colouring poster, 70 × 100 cm.', p2_url: 'https://telning.com/books/star-hoppers/story-wall-3-7', p2_price: '€19.90', cta_url: 'https://telning.com/books/star-hoppers', cta_label: 'See Star Hoppers', pim_line: 'Which would you choose: the moon, or the stars?', unsubscribe_url: '#' },
  'series-launch': { series: 'Paws & Claws', world: 'Animals of the woods, the farm and the house: sharing space, taking turns and caring for each other.', hero_image: 'https://telning.com/shop/img/paws-claws-story-wall-colouring-poster-ages-3-7/paws-claws-story-wall-colouring-poster-ages-3-7-wall-1200.webp', book_image: 'https://telning.com/shop/img/paws-claws-colouring-book-ages-3-5/paws-claws-colouring-book-ages-3-5-table-600.webp', book_title: 'The Sunny Spot', age: '3–5', book_hook: 'One warm, sunny spot. One puppy. One cat. Who gets it?', book_url: 'https://telning.com/books/paws-claws/colouring-book-3-5', book_price: '€12.90', wall_image: 'https://telning.com/shop/img/paws-claws-story-wall-colouring-poster-ages-3-7/paws-claws-story-wall-colouring-poster-ages-3-7-wall-600.webp', wall_url: 'https://telning.com/books/paws-claws/story-wall-3-7', wall_price: '€19.90', series_url: 'https://telning.com/books/paws-claws', unsubscribe_url: '#' },
  'gift-guide': { season: 'Winter', unsubscribe_url: '#' },
  campaign: { subject: 'Winter Story Walls are here', preheader: 'Three new walls to colour together this winter.', headline: 'Winter is coming to the wall', body_html: '<p style="margin:0 0 14px">Snow on the roofs, a fox in the forest, Pim with a red scarf. Our <strong>winter Story Walls</strong> are ready, made for you after you order.</p><p style="margin:0">Order before 10 December for delivery before the holidays.</p>', image: true, image_url: 'https://telning.com/shop/img/star-hoppers-story-wall-colouring-poster-ages-3-7/star-hoppers-story-wall-colouring-poster-ages-3-7-wall-1200.webp', image_alt: 'A Story Wall on a bedroom wall', image_link_url: 'https://telning.com/books', cta: true, cta_url: 'https://telning.com/books', cta_label: 'See the Story Walls', unsubscribe_url: '#' },
  'abandoned-checkout': { first: 'Anna', items: [{ qty: 1, name: 'The Garden mug' }, { qty: 1, name: 'Hello, Grandma postcards' }], basket_url: 'https://telning.com/basket', unsubscribe_url: '#' },
};
export const sampleFor = (name) => ({ ...SAMPLES._order, ...(SAMPLES[name] || {}) });
