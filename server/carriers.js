/* Parcel carriers for the "shipped" email: the name on the button and the public tracking page for a tracking number.
   Shared by the admin form (src/scripts/admin.js fills the link in for you) and the server (server/shipping.js).
   A link pasted in the admin (for example from the printer's dashboard) always wins over the pattern.
   "Other" without a link uses 17TRACK, which finds the parcel at any carrier. */
export const CARRIERS = [
  { key: 'postnord', name: 'PostNord', url: 'https://tracking.postnord.com/en/tracking?id={n}' },
  { key: 'dhl', name: 'DHL', url: 'https://www.dhl.com/global-en/home/tracking/tracking-parcel.html?submit=1&tracking-id={n}' },
  { key: 'dpd', name: 'DPD', url: 'https://tracking.dpd.de/status/en_US/parcel/{n}' },
  { key: 'gls', name: 'GLS', url: 'https://gls-group.com/GROUP/en/parcel-tracking?match={n}' },
  { key: 'ups', name: 'UPS', url: 'https://www.ups.com/track?tracknum={n}' },
  { key: 'fedex', name: 'FedEx', url: 'https://www.fedex.com/fedextrack/?trknbr={n}' },
  { key: 'royalmail', name: 'Royal Mail', url: 'https://www.royalmail.com/track-your-item#/tracking-results/{n}' },
  { key: 'evri', name: 'Evri', url: 'https://www.evri.com/track/parcel/{n}/details' },
  { key: 'usps', name: 'USPS', url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={n}' },
  { key: 'canadapost', name: 'Canada Post', url: 'https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor={n}' },
  { key: 'bring', name: 'Bring', url: 'https://tracking.bring.com/tracking/{n}' },
  { key: 'postnl', name: 'PostNL', url: 'https://jouw.postnl.nl/track-and-trace/{n}' },
  { key: 'deutschepost', name: 'Deutsche Post', url: 'https://www.deutschepost.de/de/s/sendungsverfolgung.html?piececode={n}' },
  { key: 'laposte', name: 'La Poste', url: 'https://www.laposte.fr/outils/track-a-parcel?code={n}' },
  { key: 'other', name: 'Other', url: 'https://t.17track.net/en#nums={n}' },
];
export const carrierOf = (key) => CARRIERS.find((c) => c.key === key) || null;

/** A tracking number: letters, digits, spaces and dashes, 4–40 characters. Returns the cleaned number or ''. */
export function cleanNumber(n) {
  const s = String(n || '').trim().replace(/\s+/g, ' ');
  return /^[A-Za-z0-9][A-Za-z0-9 -]{2,38}[A-Za-z0-9]$/.test(s) ? s : '';
}

/** The tracking link: the pasted https link if there is one, else the carrier's page for the number. */
export function trackingUrl(carrierKey, number, pasted = '') {
  const p = String(pasted || '').trim();
  if (p) return /^https:\/\/[^\s<>"]+$/.test(p) ? p : '';
  const c = carrierOf(carrierKey);
  const n = cleanNumber(number);
  return c && n ? c.url.replace('{n}', encodeURIComponent(n.replace(/ /g, ''))) : '';
}
