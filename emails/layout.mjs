// The one Telning email brand template (MJML): 600 px, #f6f1e8 paper, Telning green, the logo and Pim, web-safe font
// fallbacks, bulletproof buttons, a preheader, dark-mode-safe colours, alt text, the WelloWork AB footer and, for
// marketing emails, an unsubscribe link. Placeholders {{like.this}} are filled by server/emails.js.
export const BRAND = {
  paper: '#f6f1e8', cream: '#fffdf8', ink: '#16140f', soft: '#4a453d', green: '#1e4a3b', red: '#ce4029', gold: '#e8b23a', sky: '#ddebf7',
  host: 'https://telning.com',
  logo: 'https://telning.com/icon-192.png', pim: 'https://telning.com/art/pim-telning-portrait.png',
  address: 'WelloWork AB · Telning Publishing House · Dekangatan 4, Uppsala, Sweden · info@telning.com',
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
export const small = (t) => sec(`<mj-text font-family="${FONT}" font-size="13px" line-height="1.5" color="${B.soft}" padding="4px 0 8px">${t}</mj-text>`);
export const img = (src, alt) => sec(`<mj-image src="${src}" alt="${alt}" border-radius="16px" padding="0 0 16px" />`);
export const pim = (line) => `<mj-section background-color="${B.sky}" border-radius="16px" padding="12px 16px"><mj-column width="20%" vertical-align="middle"><mj-image src="${B.pim}" alt="Pim, the Telning character" width="56px" padding="0" border-radius="28px" /></mj-column><mj-column width="80%" vertical-align="middle"><mj-text font-family="${SERIF}" font-size="17px" line-height="1.4" color="${B.ink}" padding="0 0 0 8px"><span style="color:${B.soft};font-family:${FONT};font-size:12px;letter-spacing:.12em;text-transform:uppercase">Pim</span><br>${line}</mj-text></mj-column></mj-section>`;
export const product = (img, name, line, href, price = '') => `<mj-section padding="6px 0"><mj-column width="30%" vertical-align="middle"><mj-image src="${img}" alt="${name}" width="150px" border-radius="12px" padding="0" href="${href}" /></mj-column><mj-column width="70%" vertical-align="middle"><mj-text font-family="${FONT}" font-size="16px" line-height="1.5" color="${B.ink}" padding="0 0 0 12px"><a href="${href}" style="color:${B.ink};font-weight:600;text-decoration:underline;text-decoration-color:${B.red}">${name}</a>${price ? ` · ${price}` : ''}<br><span style="color:${B.soft}">${line}</span></mj-text></mj-column></mj-section>`;
export const rows = (items) => sec(`<mj-table font-family="${FONT}" font-size="15px" color="${B.ink}" cellpadding="6px 0" padding="4px 0 12px">${items}</mj-table>`);

/** Wrap the body sections in the brand frame. marketing: adds the unsubscribe line. */
export function layout({ title, preheader, body, marketing = false }) {
  return `<mjml>
<mj-head>
  <mj-title>${title}</mj-title>
  <mj-preview>${preheader}</mj-preview>
  <mj-attributes><mj-all font-family="${FONT}" /><mj-section padding="0 24px" /><mj-column padding="0" /></mj-attributes>
  <mj-style>a{color:${B.ink}} .u a{color:${B.soft}} @media (prefers-color-scheme: dark){ .frame{background:${B.paper}!important} }</mj-style>
  <mj-raw><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></mj-raw>
</mj-head>
<mj-body background-color="${B.paper}" width="600px" css-class="frame">
  <mj-section padding="24px 24px 8px"><mj-column width="60%" vertical-align="middle"><mj-image src="${B.logo}" alt="Telning Publishing House" width="44px" align="left" padding="0" href="${B.host}/" /></mj-column><mj-column width="40%" vertical-align="middle"><mj-text align="right" font-size="12px" letter-spacing="2px" color="${B.soft}" padding="0" text-transform="uppercase">Designed in Sweden</mj-text></mj-column></mj-section>
  <mj-wrapper background-color="${B.cream}" border-radius="20px" padding="20px 24px 12px">
${body}
  </mj-wrapper>
  <mj-section padding="20px 24px 8px"><mj-column>
    <mj-text font-size="12px" line-height="1.6" color="${B.soft}" align="center" padding="0">${B.address}<br><a href="${B.host}/shipping-returns" style="color:${B.soft}">Shipping &amp; returns</a> · <a href="${B.host}/privacy" style="color:${B.soft}">Privacy</a> · <a href="${B.host}/terms" style="color:${B.soft}">Terms</a>${marketing ? `<br><a href="{{unsubscribe_url}}" style="color:${B.soft}">Unsubscribe</a> · You get Letters from Pim because you signed up at telning.com and confirmed your email.` : '<br>You get this email because of your order or request at telning.com.'}</mj-text>
  </mj-column></mj-section>
  <mj-section padding="0 24px 28px"><mj-column><mj-image src="${B.pim}" alt="" width="40px" padding="0" /></mj-column></mj-section>
</mj-body>
</mjml>`;
}
