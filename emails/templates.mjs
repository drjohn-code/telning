// Every Telning email, built from the brand layout. Variables are {{placeholders}} filled at send time
// (server/emails.js). Loops are expanded there too: {{#items}}…{{/items}}. Tone: short, warm, concrete; Pim speaks
// one line to the family. Words: keepsake, never reward or prize. No partner names, ever.
import { layout, button, h1, h2, p, small, pim, product, rows, img, BRAND as B } from './layout.mjs';

const host = B.host;
const orderRows = `{{#items}}<tr><td style="padding:6px 0;border-bottom:1px solid #e9dfcf">{{qty}} × {{name}}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #e9dfcf">{{amount}}</td></tr>{{/items}}<tr><td style="padding:8px 0 0">Shipping</td><td align="right" style="padding:8px 0 0">{{shipping}}</td></tr><tr><td style="padding:4px 0;font-weight:600">Total paid</td><td align="right" style="padding:4px 0;font-weight:600">{{total}}</td></tr>`;
const keepGoing = `${h2('Keep the story going')}${product(host + '/shop/img/star-hoppers-story-wall-colouring-poster-ages-3-5/star-hoppers-story-wall-colouring-poster-ages-3-5-wall-600.webp', 'Story Walls', 'The whole world of the story on the wall, to colour together.', host + '/books', '')}${product(host + '/shop/img/gift-set/gift-set-halloween-gift-set-600.webp', 'Halloween gifts', 'Mugs, tote bags and cards with our cats and dogs.', host + '/gifts', '')}`;

export const TEMPLATES = {
  /* ---------- transactional ---------- */
  'order-confirmation': { subject: 'Your Telning order {{number}}', kind: 'transactional', build: () => layout({ title: 'Your Telning order', preheader: 'Thank you, {{first}}. Your order {{number}} is in and we are making it for you.', body: `
${h1('Thank you, {{first}}.')}
${p('Your order <strong>{{number}}</strong> is in. Everything is made for you after you order, so it takes a few working days: EU 3–10, US/UK/Canada 3–7. Items may arrive in separate parcels, each with its own tracking link.')}
${rows(orderRows)}
${p('<strong>Delivery to</strong><br>{{address}}')}
${button(host + '/shipping-returns', 'Delivery and returns')}
${pim('When the story is finished, I’d love to see the ending.')}
${small('Unused items can be returned within 14 days. If something arrives damaged or wrong, reply to this email with a photo and we replace it. Questions? Reply to this email or write to {{contact}}.')}` }) },
  'order-making': { subject: 'We are making your order {{number}}', kind: 'transactional', build: () => layout({ title: 'Your order is being made', preheader: 'Good news, {{first}}: your Telning order is on the press.', body: `
${h1('Your order is being made.')}
${p('Hello {{first}}, your order <strong>{{number}}</strong> is on its way through the workshop. We print and make every item after it is ordered, as close to you as we can. You get the tracking link as soon as a parcel ships.')}
${rows('{{#items}}<tr><td style="padding:6px 0;border-bottom:1px solid #e9dfcf">{{qty}} × {{name}}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #e9dfcf">{{status}}</td></tr>{{/items}}')}
${pim('Crayons ready?')}` }) },
  'order-shipped': { subject: 'A parcel from your order {{number}} is on its way', kind: 'transactional', build: () => layout({ title: 'Your parcel has shipped', preheader: 'Track it here: {{carrier}} {{tracking_number}}.', body: `
${h1('A parcel is on its way.')}
${p('Hello {{first}}, this parcel from your order <strong>{{number}}</strong> has left the workshop:')}
${rows('{{#items}}<tr><td style="padding:6px 0;border-bottom:1px solid #e9dfcf">{{qty}} × {{name}}</td></tr>{{/items}}')}
${p('Carrier: {{carrier}} · Tracking number: {{tracking_number}}')}
${button('{{tracking_url}}', 'Track the parcel')}
${small('{{parcel_note}}')}
${pim('Almost there.')}` }) },
  'order-delivered': { subject: 'Your Telning parcel has arrived', kind: 'transactional', build: () => layout({ title: 'Delivered', preheader: 'A few care tips, and one idea for after the last page.', body: `
${h1('It has arrived.')}
${p('Hello {{first}}, your parcel from order <strong>{{number}}</strong> was delivered. A few tips so it lasts:')}
${p('• <strong>Books:</strong> pencils and crayons work best; thick markers can show through.<br>• <strong>Story Wall:</strong> lay it flat under a few books for a day after unrolling; put card under felt-tips.<br>• <strong>Mugs:</strong> dishwasher safe; hand washing keeps the print bright longer.<br>• <strong>Tote bag:</strong> wash at 30°C inside out, do not iron on the print.')}
${keepGoing}
${pim('Which ending did you choose? Send it to me: telning.com/send')}
${small('Anything wrong with the parcel? Reply to this email with a photo and we sort it out.')}` }) },
  'review-request': { subject: 'How was the story, {{first}}?', kind: 'transactional', build: () => layout({ title: 'How was it?', preheader: 'Two weeks on: tell us, honestly, how it went.', body: `
${h1('How was the story?')}
${p('Hello {{first}}, it has been about two weeks since your order <strong>{{number}}</strong> arrived. If you have a minute, we would love to know how it went: what your child liked, what was hard, what we should change. Honest words help us most. There is nothing attached to a good or a bad review; we read every one and answer when we can.')}
${button('mailto:' + '{{contact}}' + '?subject=Order%20{{number}}', 'Reply with your thoughts')}
${pim('Tell me everything. Especially the ending.')}` }) },
  'story-card': { subject: 'Your story card from Pim', kind: 'transactional', build: () => layout({ title: 'A story card from Pim', preheader: '{{child}} chose an ending. Pim wrote back.', body: `
${h1('A card for {{child}}.')}
${p('{{child}}, {{age}}, finished <em>{{book}}</em> and chose the ending: <strong>{{ending}}</strong>. Pim wrote this back:')}
${pim('{{pim_line_1}}')}
${pim('{{pim_line_2}}')}
${h2('For the next talk')}
${p('{{talk_next}}')}
${p('The card is attached, ready to print or save. We have deleted your answers, as promised.')}
${button(host + '/guide', 'How to read a Telning book together')}` }) },
  'newsletter-confirm': { subject: 'Please confirm: Letters from Pim', kind: 'transactional', build: () => layout({ title: 'Confirm your email', preheader: 'One tap, and Pim can write to you.', body: `
${h1('One more step.')}
${p('Thank you for signing up for <strong>Letters from Pim</strong>. Please confirm that this is your email address, so we know it was you.')}
${button('{{confirm_url}}', 'Yes, send me Letters from Pim')}
${small('If you did not sign up, ignore this email and nothing happens. We write only when there is something new: a book, a Story Wall, a gift idea for a season.')}` }) },
  'newsletter-welcome': { subject: 'Welcome to Letters from Pim', kind: 'marketing', build: () => layout({ marketing: true, title: 'Welcome', preheader: 'A free printable page to start, and what to expect from Pim.', body: `
${h1('Welcome. Pim is pleased.')}
${p('You are on the list. Pim writes a few times a year, when a new series comes out, when a Story Wall is ready, or when there is a gift idea for a season. Short letters, one story each, no noise.')}
${p('To start: a printable page from a Telning book, with the conversation guide on it.')}
${button(host + '/guide', 'Get the free page')}
${pim('Hi, I’m Pim! In every story, you choose what happens next.')}` }) },
  'quote-received': { subject: 'We received your request, {{organisation}}', kind: 'transactional', build: () => layout({ title: 'Quote request received', preheader: 'We answer within two working days.', body: `
${h1('Thank you, we have your request.')}
${p('Hello, this is to confirm that we received your request for <strong>{{organisation}}</strong>. We answer within two working days with a quote and, if you asked for it, the invoice details.')}
${p('<strong>What you asked for</strong><br>{{wish}}')}
${button(host + '/organisations', 'The story packs')}
${pim('One story, many children. I like that.')}` }) },
  'invoice-sent': { subject: 'Your invoice from Telning, {{organisation}}', kind: 'transactional', build: () => layout({ title: 'Invoice', preheader: 'Invoice {{invoice_number}}, 30 days to pay.', body: `
${h1('Your invoice is attached.')}
${p('Hello, the invoice <strong>{{invoice_number}}</strong> for <strong>{{organisation}}</strong> is attached, with your reference and VAT number. Payment within 30 days. As soon as it is paid, we start making the pack and send the group guide to {{email}}.')}
${rows('{{#items}}<tr><td style="padding:6px 0;border-bottom:1px solid #e9dfcf">{{qty}} × {{name}}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #e9dfcf">{{amount}}</td></tr>{{/items}}<tr><td style="padding:8px 0 0;font-weight:600">Total</td><td align="right" style="padding:8px 0 0;font-weight:600">{{total}}</td></tr>')}
${small('Questions about the invoice? Reply to this email.')}` }) },
  'return-received': { subject: 'Your return request, order {{number}}', kind: 'transactional', build: () => layout({ title: 'Return request received', preheader: 'What happens next with your return.', body: `
${h1('We have your return request.')}
${p('Hello {{first}}, we received your request to return <strong>{{what}}</strong> from order <strong>{{number}}</strong>. Here is what happens next:')}
${p('1. Send the items back unused, in their packaging where possible, to:<br><strong>{{return_address}}</strong><br>2. You pay the return postage; keep the receipt.<br>3. We refund the price and the standard delivery cost within 14 days of receiving the parcel, to the card you paid with.')}
${small('If something arrived damaged or wrong, you do not need to send it back: reply with a photo and we replace it at our cost.')}` }) },
  'auth-reset': { subject: 'Reset your Telning admin password', kind: 'transactional', build: () => layout({ title: 'Password reset', preheader: 'This link works for 60 minutes.', body: `
${h1('Reset your password.')}
${p('Someone asked to reset the password for the Telning admin account <strong>{{email}}</strong>. If it was you, use the button below within 60 minutes.')}
${button('{{ .ConfirmationURL }}', 'Choose a new password')}
${small('If it was not you, ignore this email. Your password stays the same.')}` }) },
  'auth-magic': { subject: 'Your Telning admin sign-in link', kind: 'transactional', build: () => layout({ title: 'Sign in', preheader: 'Your sign-in link, valid for 60 minutes.', body: `
${h1('Sign in to the admin.')}
${button('{{ .ConfirmationURL }}', 'Sign in')}
${small('The link works once and expires in 60 minutes. If you did not ask for it, ignore this email.')}` }) },
  /* ---------- marketing ---------- */
  'letters-from-pim': { subject: '{{subject}}', kind: 'marketing', build: () => layout({ marketing: true, title: 'Letters from Pim', preheader: '{{preheader}}', body: `
${img('{{hero_image}}', '{{hero_alt}}')}
${h1('{{headline}}')}
${p('{{story}}')}
${product('{{p1_image}}', '{{p1_name}}', '{{p1_line}}', '{{p1_url}}', '{{p1_price}}')}
${product('{{p2_image}}', '{{p2_name}}', '{{p2_line}}', '{{p2_url}}', '{{p2_price}}')}
${button('{{cta_url}}', '{{cta_label}}')}
${pim('{{pim_line}}')}` }) },
  'series-launch': { subject: 'New: {{series}} is out', kind: 'marketing', build: () => layout({ marketing: true, title: 'A new series', preheader: 'Two books and two Story Walls: {{series}}.', body: `
${img('{{hero_image}}', 'The {{series}} Story Wall on a child’s bedroom wall')}
${h1('{{series}} is out.')}
${p('{{world}}')}
${product('{{book_image}}', '{{book_title}}', 'Colouring book, ages {{age}}. {{book_hook}}', '{{book_url}}', '{{book_price}}')}
${product('{{wall_image}}', '{{series}} Story Wall', 'A large colouring picture for the wall, 70 × 100 cm. About a third in colour; the rest is theirs.', '{{wall_url}}', '{{wall_price}}')}
${button('{{series_url}}', 'See the series')}
${pim('I’m hiding somewhere on the wall. Can you find me?')}` }) },
  'gift-guide': { subject: 'Gifts that keep the story going', kind: 'marketing', build: () => layout({ marketing: true, title: 'Gift guide', preheader: '{{season}}: four quiet gifts for the grown-ups who read.', body: `
${h1('{{season}} gifts, the Telning way.')}
${p('For the grown-ups who read the story every night: this autumn, our Halloween cats and dogs. Each one is made for you after you order, so order a little early.')}
${product(host + '/shop/img/cocoa-cat-mug/cocoa-cat-mug-placeholder-600.webp', 'Cocoa Cat mug', 'A witch-hat cat and a warm cup of cocoa.', host + '/gifts/mugs/cocoa-cat', '')}
${product(host + '/shop/img/moon-cat-tote-bag/moon-cat-tote-bag-placeholder-600.webp', 'Moon Cat tote bag', 'GOTS-certified organic cotton. A tall cat in a witch hat under the moon.', host + '/gifts/tote-bags/moon-cat', '')}
${product(host + '/shop/img/boo-cat-greeting-cards/boo-cat-greeting-cards-placeholder-600.webp', 'Boo Cat greeting cards', 'Ten cards with envelopes, blank inside.', host + '/gifts/greeting-cards/boo-cat', '')}
${button(host + '/gifts', 'See all gifts')}
${pim('The grown-ups get something too.')}` }) },
  'abandoned-checkout': { subject: 'Your basket is still here', kind: 'marketing', build: () => layout({ marketing: true, title: 'Your basket', preheader: 'Nothing is reserved; we just kept it for you.', body: `
${h1('Still thinking it over?')}
${p('Hello {{first}}, you left a few things in your basket at telning.com. Nothing is reserved and nothing is charged; we simply kept the list for you.')}
${rows('{{#items}}<tr><td style="padding:6px 0;border-bottom:1px solid #e9dfcf">{{qty}} × {{name}}</td></tr>{{/items}}')}
${button('{{basket_url}}', 'Back to my basket')}
${small('You get this one email because you gave your address at checkout and agreed to hear from us. No more reminders after this.')}` }) },
};
