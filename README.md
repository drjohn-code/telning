# Telning Publishing House: website

Picture books for children 0–7, built around decision intelligence. This is the marketing site, built
from the **Telning design system** (Claude Design): https://claude.ai/artifact/4aiKD3bXyxe7KAB9f6yERq

Static site built with [Astro](https://astro.build). No UI framework; the interactivity (depth, tilt, reveal,
phone menu, email form) is the small vanilla helper from the design system.

## Run

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # regenerates tokens.css, then builds to dist/
npm run preview
```

## Layout

| Path | What |
| --- | --- |
| `design/tokens.json` | Design tokens (source of truth). `npm run tokens` writes `src/styles/tokens.css`. |
| `design/BRAND.md` | The brand book: rules, voice, safe/forbidden words, colour and type usage. Read it before writing copy. |
| `src/styles/telning.css` | Component styles from the design system (`tn-` classes). |
| `src/scripts/telning.js` | `window.Telning` helpers: `initDepth`, `initTilt`, `initReveal`, `initMenu`, `initEmail`. |
| `src/data/site-data.json` | Facts that change: series, ages, skills, books, social links, `formEndpoint`. |
| `src/data/strings.*.json` | UI text (EN ready; DE/SV keys present, empty). |
| `src/components/` | Page sections: Header, Hero, AgeStrip, Series, Skills, TadaBand, SendEnding, TrustBand, EmailBlock, Footer. |
| `public/fonts/` | Fraunces and Instrument Sans (SIL OFL), self-hosted. Never load them from Google. |

## Before going live

- **Art slots**: Pim and the series art come from the illustrator. In `npm run dev` empty slots show the file
  they wait for (`pim-hello.png`, `pim-letter.png`, `pim-question.png`, `series-*.png`, `story-card-example.png`).
  The brand rules say the site must not go live with an empty slot.
- **Email signup**: set `formEndpoint` in `src/data/site-data.json`. While it is empty the form only pretends to submit.
- **Other pages**: the design covers the home page only. Links to `/books`, `/series/*`, `/tada`, `/guide`, `/send`,
  `/pim`, `/about`, `/teachers`, `/privacy`, `/childrens-privacy`, `/terms` need pages. `/guide` and `/send`
  are printed in the books as QR codes, so those addresses must never change.
