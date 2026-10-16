// The one Telning email brand template (MJML): 600 px, #f6f1e8 paper, Telning green, the logo and Pim, web-safe font
// fallbacks, bulletproof buttons, a preheader, dark-mode-safe colours, alt text, the WelloWork AB footer and, for
// marketing emails, an unsubscribe link. Placeholders {{like.this}} are filled by server/emails.js.
export const BRAND = {
  paper: '#f6f1e8', paperDeep: '#e9dfcf', cream: '#fffdf8', ink: '#16140f', soft: '#4a453d', green: '#1e4a3b', red: '#ce4029', gold: '#e8b23a', sky: '#ddebf7',
  host: 'https://telning.com',
  logo: 'https://telning.com/email/telning-logo-badge.png',   // on a paper block, readable in dark mode
  pim: 'https://telning.com/art/pim-telning-portrait.png',
  address: 'WelloWork AB · Telning Publishing House · Dekangatan 4, Uppsala, Sweden · info@telning.com',
  instagram: 'https://www.instagram.com/telning.pub/',
};
const B = BRAND;
export const FONT = "'Instrument Sans', Helvetica, Arial, sans-serif";
export const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";

/** A bulletproof button (VML for Outlook inside mj-button). */
const sec = (inner) => `<mj-section padding="0"><mj-column padding="0">${inner}</mj-column></mj-section>`;
export const button = (href, label, { colour = B.ink, text = B.cream } = {}) =>
  sec(`<mj-button href="${href}" background-color="${colour}" color="${text}" border-radius="999px" font-family="${FONT}" font-size="16px" font-weight="600" inner-padding="14px 28px" padding="8px 0 16px" align="left">${label}</mj-button>`);

export const h1 = (t) => sec(`<mj-text font-family="${SERIF}" font-size="30px" line-height="1.15" font-weight="600" color="${B.ink}" padding="8px 0 12px">${t}</mj-text>`);
export const h2 = (t) => sec(`<mj-text font-family="${SERIF}" font-size="22px" line-height="1.2" font-weight="600" color="${B.ink}" padding="20px 0 8px">${t}</mj-text>`);
export const p = (t, o = {}) => sec(`<mj-text font-family="${FONT}" font-size="${o.size || 16}px" line-height="1.6" color="${o.colour || B.ink}" padding="0 0 12px">${t}</mj-text>`);
export const small = (t) => sec(`<mj-text font-family="${FONT}" font-size="13px" line-height="1.5" color="${B.soft}" padding="14px 0 8px">${t}</mj-text>`);
export const img = (src, alt, href = '') => sec(`<mj-image src="${src}" alt="${alt}" border-radius="16px" padding="0 0 16px"${href ? ` href="${href}"` : ''} />`);
export const pim = (line) => `<mj-section background-color="${B.sky}" border-radius="16px" padding="12px 16px"><mj-group><mj-column width="20%" vertical-align="middle"><mj-image src="${B.pim}" alt="Pim, the Telning character" width="56px" padding="0" border-radius="28px" /></mj-column><mj-column width="80%" vertical-align="middle"><mj-text font-family="${SERIF}" font-size="17px" line-height="1.4" color="${B.ink}" padding="0 0 0 8px"><span style="color:${B.soft};font-family:${FONT};font-size:12px;letter-spacing:.12em;text-transform:uppercase">Pim</span><br>${line}</mj-text></mj-column></mj-group></mj-section>`;
export const product = (img, name, line, href, price = '') => `<mj-section padding="6px 0"><mj-column width="30%" vertical-align="middle"><mj-image src="${img}" alt="${name}" width="150px" border-radius="12px" padding="0" href="${href}" /></mj-column><mj-column width="70%" vertical-align="middle"><mj-text font-family="${FONT}" font-size="16px" line-height="1.5" color="${B.ink}" padding="0 0 0 12px"><a href="${href}" style="color:${B.ink};font-weight:600;text-decoration:underline;text-decoration-color:${B.red}">${name}</a>${price ? ` · ${price}` : ''}<br><span style="color:${B.soft}">${line}</span></mj-text></mj-column></mj-section>`;
export const rows = (items) => sec(`<mj-table font-family="${FONT}" font-size="15px" color="${B.ink}" cellpadding="6px 0" padding="4px 0 12px">${items}</mj-table>`);

/* ---------- order email pieces (tables, so they stay side by side on a phone) ---------- */
/** A folk picture (public/email/<name>.png, 140 px) above the heading. */
export const picture = (name, alt = '') => sec(`<mj-image src="${B.host}/email/${name}.png" alt="${alt}" width="120px" align="left" padding="0 0 12px" />`);
/** A small red label above the heading. */
export const eyebrow = (t) => sec(`<mj-text font-family="${FONT}" font-size="12px" font-weight="600" letter-spacing="2px" text-transform="uppercase" color="${B.red}" padding="0 0 4px">${t}</mj-text>`);
/** Two or three facts in a paper box: [[label, value], …]. stack: on a phone the facts go under each other (long values). */
export const facts = (pairs, { stack = false } = {}) => sec(`<mj-text font-family="${FONT}" color="${B.ink}" padding="4px 0 20px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;background:${B.paper};border-radius:14px;border-collapse:separate"><tr>${pairs.map(([k, v], i) => `<td class="${stack ? 'fact' : ''}" style="padding:14px 16px;vertical-align:top;${i ? `border-left:1px solid ${B.paperDeep};` : ''}"><span style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${B.soft}">${k}</span><br><span style="font-size:16px;font-weight:600;line-height:1.5;word-break:break-word">${v}</span></td>`).join('')}</tr></table></mj-text>`);
/** Order lines with a square photo: {{#items}} with image, name, line, qty, amount. */
export const items = (withAmount = true) => sec(`<mj-table font-family="${FONT}" color="${B.ink}" padding="0 0 4px" cellpadding="0" width="100%">{{#items}}<tr><td width="72" style="padding:10px 0;border-bottom:1px solid ${B.paperDeep};vertical-align:middle;width:72px">{{#thumb}}<img src="{{image}}" alt="" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:12px;border:0">{{/thumb}}{{^thumb}}<div style="width:72px;height:72px;border-radius:12px;background:${B.paper}"></div>{{/thumb}}</td><td style="padding:10px 0 10px 14px;border-bottom:1px solid ${B.paperDeep};vertical-align:middle;font-size:15px;line-height:1.4"><strong>{{name}}</strong><br><span style="font-size:13px;color:${B.soft}">{{#line}}{{line}}<br>{{/line}}Qty {{qty}}</span></td>${withAmount ? `<td align="right" style="padding:10px 0 10px 8px;border-bottom:1px solid ${B.paperDeep};vertical-align:middle;font-size:15px;white-space:nowrap">{{amount}}</td>` : ''}</tr>{{/items}}</mj-table>`);
/** Subtotal, shipping, VAT and total. */
export const totals = () => sec(`<mj-table font-family="${FONT}" font-size="15px" color="${B.ink}" padding="8px 0 16px" cellpadding="0" width="100%"><tr><td style="padding:4px 0;color:${B.soft}">Subtotal</td><td align="right" style="padding:4px 0">{{subtotal}}</td></tr>{{#discount}}<tr><td style="padding:4px 0;color:${B.soft}">{{discount_label}}</td><td align="right" style="padding:4px 0">{{discount_amount}}</td></tr>{{/discount}}<tr><td style="padding:4px 0;color:${B.soft}">Shipping</td><td align="right" style="padding:4px 0">{{shipping}}</td></tr>{{#vat}}<tr><td style="padding:4px 0;color:${B.soft}">{{vat_label}}</td><td align="right" style="padding:4px 0">{{vat_amount}}</td></tr>{{/vat}}<tr><td style="padding:10px 0 0;border-top:2px solid ${B.ink};font-size:17px;font-weight:600">Total paid</td><td align="right" style="padding:10px 0 0;border-top:2px solid ${B.ink};font-size:17px;font-weight:600">{{total}}</td></tr></mj-table>`);
/** Numbered steps: [[title, text], …]. `now` (1-based) is the current step: it is filled green, the ones before it are ticked. */
export const steps = (list, now = 1) => {
  const dot = (i) => {
    const base = 'width:30px;height:30px;line-height:30px;border-radius:15px;text-align:center;font-size:14px;font-weight:600;';
    if (i + 1 < now) return `<div style="${base}background:${B.green};color:${B.cream}">✓</div>`;
    if (i + 1 === now) return `<div style="${base}background:${B.green};color:${B.cream}">${i + 1}</div>`;
    return `<div style="${base}width:28px;height:28px;line-height:28px;background:${B.cream};color:${B.soft};border:1px solid ${B.paperDeep}">${i + 1}</div>`;
  };
  return sec(`<mj-table font-family="${FONT}" color="${B.ink}" padding="0 0 12px" cellpadding="0" width="100%">${list.map(([t, d], i) => `<tr><td width="40" style="padding:8px 0;vertical-align:top;width:40px">${dot(i)}</td><td style="padding:8px 0 8px 6px;vertical-align:top;font-size:15px;line-height:1.5"><strong>${t}</strong><br><span style="color:${B.soft}">${d}</span></td></tr>`).join('')}</mj-table>`);
};
/** A labelled box, e.g. the delivery address. */
export const box = (label, html) => sec(`<mj-text font-family="${FONT}" font-size="15px" line-height="1.6" color="${B.ink}" padding="4px 0 16px"><div style="background:${B.paper};border-radius:14px;padding:14px 16px"><span style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${B.soft}">${label}</span><br>${html}</div></mj-text>`);
/** A quiet outline button (second action). */
export const button2 = (href, label) => sec(`<mj-button href="${href}" background-color="${B.cream}" color="${B.ink}" border="2px solid ${B.ink}" border-radius="999px" font-family="${FONT}" font-size="15px" font-weight="600" inner-padding="11px 22px" padding="4px 0 16px" align="left">${label}</mj-button>`);

/** Wrap the body sections in the brand frame. marketing: adds the unsubscribe line. */
export function layout({ title, preheader, body, marketing = false }) {
  return `<mjml>
<mj-head>
  <mj-title>${title}</mj-title>
  <mj-preview>${preheader}</mj-preview>
  <mj-attributes><mj-all font-family="${FONT}" /><mj-section padding="0 24px" /><mj-column padding="0" /></mj-attributes>
  <mj-style>
    @font-face{font-family:Fraunces;font-weight:600;src:url(${B.host}/fonts/Fraunces-600.woff2) format('woff2')}
    @font-face{font-family:'Instrument Sans';font-weight:400;src:url(${B.host}/fonts/InstrumentSans-400.woff2) format('woff2')}
    @font-face{font-family:'Instrument Sans';font-weight:600;src:url(${B.host}/fonts/InstrumentSans-600.woff2) format('woff2')}
    a{color:${B.ink}} .foot a{color:${B.soft};text-decoration:underline}
    @media (prefers-color-scheme: dark){ .frame{background:${B.paper}!important} }
    @media only screen and (max-width:479px){ .card{padding-left:16px!important;padding-right:16px!important} .fact{display:block!important;border-left:0!important} .fact + .fact{border-top:1px solid ${B.paperDeep}!important} }
  </mj-style>
  <mj-raw><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></mj-raw>
</mj-head>
<mj-body background-color="${B.paper}" width="600px" css-class="frame">
  <mj-section padding="16px 0 10px"><mj-column padding="0"><mj-text padding="0" line-height="0" font-size="0">${header()}</mj-text></mj-column></mj-section>
  <mj-wrapper background-color="${B.cream}" border-radius="20px" padding="24px 28px 16px" css-class="card">
${body}
  </mj-wrapper>
${footer(marketing)}
</mj-body>
</mjml>`;
}

/** The header band: the logo block (a picture) and paper.png stretched over the rest, as wide as the card below.
    Pictures, not a background colour, so dark-mode apps cannot darken it and the black logo words stay readable. */
export function header() {
  const td = 'padding:0;line-height:0;font-size:0;mso-line-height-rule:exactly';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse"><tr><td width="218" style="${td};width:218px"><a href="${B.host}/"><img src="${B.logo}" alt="Telning Publishing House" width="218" height="75" style="display:block;border:0;width:218px;height:75px"></a></td><td bgcolor="${B.paper}" style="${td};background:${B.paper}"><img src="${B.host}/email/paper.png" alt="" width="100%" height="75" style="display:block;border:0;width:100%;height:75px"></td></tr></table>`;
}

/** The standard footer of every email: menu links, Pim, the company line, legal links and why you get this email. */
export function footer(marketing = false) {
  const link = (href, label) => `<a href="${href}" style="color:${B.ink};text-decoration:none;font-weight:600">${label}</a>`;
  const why = marketing
    ? `You get this email because you agreed to hear from Telning. <a href="{{unsubscribe_url}}">Unsubscribe</a> with one click.`
    : 'You get this email because of your order or request at telning.com.';
  return `  <mj-section padding="24px 24px 0"><mj-column>
    <mj-text align="center" font-size="14px" line-height="1.6" color="${B.ink}" padding="0 0 16px">${link(`${B.host}/books`, 'Story Walls')} &nbsp;·&nbsp; ${link(`${B.host}/gifts`, 'Gifts')} &nbsp;·&nbsp; ${link(`${B.host}/shipping-returns`, 'Help')} &nbsp;·&nbsp; ${link(B.instagram, 'Instagram')}</mj-text>
    <mj-image src="${B.pim}" alt="Pim, the Telning character" width="44px" padding="0 0 12px" />
    <mj-text css-class="foot" align="center" font-size="12px" line-height="1.6" color="${B.soft}" padding="0 0 8px">${B.address}<br>Designed in Sweden<br><a href="${B.host}/privacy">Privacy</a> · <a href="${B.host}/terms">Terms</a> · <a href="${B.host}/shipping-returns">Shipping &amp; returns</a></mj-text>
    <mj-text css-class="foot" align="center" font-size="12px" line-height="1.6" color="${B.soft}" padding="0 0 32px">${why}</mj-text>
  </mj-column></mj-section>`;
}

/** Show a block only when data[key] is a non-empty list: {{#key}}…{{/key}} around whole sections. */
export const when = (key, inner) => `<mj-raw>{{#${key}}}</mj-raw>${inner}<mj-raw>{{/${key}}}</mj-raw>`;
