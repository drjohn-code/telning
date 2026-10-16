/* /llms.txt: the site in plain text for AI answer engines (llmstxt.org format). Built from the same data as the pages
   (catalogue, site-data.json, seo.json, server/shop-seo.js), so the ages, prices, series and URLs stay true when the shop
   changes. It replaced a hand-written public/llms.txt on 16 Oct 2026 that still sold the books and named the old ages.
   Facts only, in the brand's words: no claims that scripts/claims-lint.mjs would refuse on a page. */
import { catalog, site, shop, allPages, displayName, ageGroupsOf, giftPath, GIFT_TYPES } from '../lib/shop';

const HOST = 'https://telning.com';
const CURS = Object.keys(shop.currencies);
const prices = (cents: Record<string, number>) => CURS.map((c) => `${c} ${(cents[c] / 100).toFixed(2)}`).join(' / ');   // currency codes: US and Canadian dollars both print as "$"
const page = (path: string, label?: string) => {
  const e = (allPages as any)[path];
  return `- [${label || e.name}](${HOST}${path === '/' ? '/' : path}): ${e.description}`;
};

export function GET() {
  const live = catalog.products.filter((p: any) => !p.hidden);
  const walls = live.filter((p: any) => p.type === 'poster');
  const wall = walls[0];
  const groups = new Set(live.filter((p: any) => p.category === 'books').flatMap((p: any) => ageGroupsOf(p)));
  const ages = site.ages.map((a: any) => `${a.label} ${a.name}${groups.has(a.key) ? '' : ' (coming soon)'}`).join(', ');
  const legal = site.legal as { company: string; orgNumber: string; address: string };
  const social = site.social as Record<string, string>;
  const gift = (t: string) => {
    const ps = live.filter((p: any) => p.type === t);
    const from = ps.map((p: any) => (p.variants ? p.variants[0].price : p.price)).sort((a: any, b: any) => a.EUR - b.EUR)[0];
    return { n: ps.length, from: prices(from), only: ps[0]?.regions };
  };
  const occasions = [...new Set(live.map((p: any) => p.occasion).filter(Boolean))].map((o: any) => (o === 'everyday' ? 'every day' : o === 'birthday' ? 'birthdays' : catalog.gifts.occasions[o] || o));

  const lines = [
    `# ${site.publisher}`,
    '',
    `> Telning (telning.com) is a small publishing house in Uppsala, Sweden, run by a team of cognitive and behavioural scientists. It sells Story Walls (large 100 × 70 cm colouring pictures for the wall, one per story series, for ages 3–7 and 7+) and gifts for the grown-ups: mugs, organic cotton tote bags, postcards and greeting cards. Its wordless colouring story books, where the child chooses how the story ends, are being made and are not on sale yet.`,
    '',
    '"Telning" is Swedish for a young shoot. It is not the Swedish dictionary word in any other sense on this site.',
    '',
    '## Key facts',
    '',
    `- Story Walls: ${walls.length} Story Walls, two for each of ${walls.length / 2} series. Both walls of a series show the same picture: the one for ages 3–7 has bigger shapes and thick outlines for small hands, the one for ages 7+ has smaller shapes and more to find. About one shape in seven comes painted as a colour guide; the rest is black line art. Families unroll it on the floor, colour it together over many days, then frame it (70 × 100 cm frame). Price: ${prices(wall.price)}.`,
    `- Age groups on the site: ${ages}.`,
    `- Gifts: ${gift('mug').n} mugs (from ${gift('mug').from}), ${gift('tote').n} tote bags in GOTS-certified organic cotton (from ${gift('tote').from}), ${gift('postcards').n} postcard designs in packs of 10 (from ${gift('postcards').from}) and ${gift('cards').n} greeting card designs in packs of 10 with envelopes (from ${gift('cards').from}). Cats, dogs and folk-art plants, for ${occasions.join(', ')}.`,
    `- Colouring story books (coming, not on sale yet): 21.6 × 21.6 cm, 32 pages, wordless. The child colours the story, chooses one of two endings or draws a new one on the last page, and talks about it with a grown-up.`,
    `- Delivery: ${shop.delivery}`,
    `- Postcards and greeting cards are delivered to the EU and the UK only.`,
    `- Prices in ${CURS.join(', ')}. The currency sets the delivery region: EUR for the EU, GBP for the UK, USD for the US, CAD for Canada. EUR and GBP prices include VAT; in the US and Canada sales tax, where it applies, is added at checkout.`,
    `- Returns: unused items within 14 days; the customer pays the return postage. If an item arrives damaged or wrong, Telning replaces it.`,
    `- TADA is Telning's own way to talk about a story with a child: Talk, Ask, Decide, Act. It is based on dialogic reading and on the team's clinical and behavioural work.`,
    `- Pim is the Telning character: a small hedgehog with green leaf spines and three gold stars on its head. Pim speaks for Telning, writes the letters and signs the story cards. Pim is not part of any series.`,
    `- A story card: a parent sends the child's drawn ending; Telning sends back a card with two lines from Pim, plus ideas for the next talk. First name and age only, never a photo of a child.`,
    `- Legal entity: ${legal.company} (Swedish organisation number ${legal.orgNumber}), ${legal.address}. Contact: ${site.contactEmail}. Social: Instagram and TikTok ${social.handle}, LinkedIn /company/telning.`,
    '',
    '## Shop',
    '',
    page('/books', 'Books & Story Walls'),
    ...site.series.map((s: any) => {
      const ws = walls.filter((p: any) => p.series === s.key);
      if (!ws.length) return null;
      return `- [${s.name}](${HOST}/books/${s.key}) (${s.theme}): ${ws.map((p: any) => `[${displayName(p)}](${HOST}${p.url})`).join(', ')}. ${ws[0].poster.scene}`;
    }).filter(Boolean),
    page('/gifts'),
    ...GIFT_TYPES.map((t: string) => page(giftPath(t))),
    page('/organisations'),
    page('/materials'),
    page('/shipping-returns'),
    '',
    '## For families and teachers',
    '',
    page('/', 'Home'),
    page('/tada'),
    page('/guide'),
    page('/send'),
    page('/teachers'),
    page('/pim'),
    page('/about'),
    '',
    '## Optional',
    '',
    page('/privacy'),
    page('/childrens-privacy'),
    page('/terms'),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
