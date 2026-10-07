# Prompt for Claude Code: Telning website — landing fixes + all missing pages

Read this whole file before you start. Then follow section 1.

**Update, 7 October 2026:** two image files come with this prompt (section 2.1b). New: a founder note on `/about` (section 4.2, page 4, "Founder note") and the Pim art, used everywhere Pim was missing (section 4.1, "Pim art"). Small related changes: 0, 2.2, 3 (A9), 4.2, 5.4, 6.5, 7 and 8.

---

## 0. Summary

### Problem
- The landing page has 8 issues from feedback (section 3).
- Many links open a 404 page: `/tada`, `/guide`, `/send`, `/about`, `/pim`, `/teachers`, `/privacy`, `/childrens-privacy`, `/terms`.
- Our buyers are parents. They pay more than for a cheap colouring book, so the site must feel premium, joyful and trustworthy. Inner pages do not exist yet.
- Telning is a new brand, and "telning" is also a normal Swedish word. Google and AI engines (ChatGPT, Perplexity, Claude, Gemini, Copilot) do not know us yet.

### Solution
- **Part A:** fix the landing feedback.
- **Part B:** build every missing page (plus a 404 page) in the Telning web design system: colourful, premium, trustworthy, with paper illustrations that move as you scroll.
- **Part C:** build the "Send Pim your ending" flow: drawing upload, story card, and a "talk next" note for parents. The privacy promise must be true in the code.
- **Part D (priority, built into every page):** SEO for Google and AI engines: crawlable pages, a keyword map, structured data, sitemap, robots.txt, speed, and a Google Search Console and Bing launch list for me.

### Outcome
- No dead links. Every click lands in the right place, not under the header.
- In one minute a parent understands: what TADA is, that it comes from research and clinical and behavioural work, what is new, and how to use the book at home.
- A parent sends a drawing and gets back a story card plus ideas for the next talk with the child.
- On `/about` a parent meets the founder: a kind note, a friendly face, and a way to write to him.
- Pim is on the site: on `/pim`, in every Pim note, on the story card and on the 404 page. No fallback art for a missing Pim.
- No sentence on the site that we cannot defend.
- Google indexes every page. AI engines can read, understand and quote our pages. Search Console shows no errors.

---

## 1. How to work with me

- Write to me in simple English (IELTS 6 level). Short answers. No long reports.
- Every plan starts with **Problem / Solution / Outcome** in a few simple lines. Details after.
- Order of work:
  1. Read the docs and the repo. Send me the inventory (section 2.3).
  2. Send me a short plan. **Wait for my OK.**
  3. Part A. Show me screenshots.
  4. Part D setup: keyword map, titles, structured data plan, sitemap, robots.txt (section 6). Show me the keyword map before you write page copy.
  5. Part B, one page at a time. Each page must pass the SEO checklist (6.10) before you show me screenshots (375 px and 1280 px).
  6. Part C.
  7. Final checks (section 7).
- Work on a new git branch `site-v2-pages`. One small commit per item.
- If this prompt conflicts with the repo or the docs, stop and ask me. Do not guess.
- Questions you must ask me instead of inventing an answer are in section 8.
- SEO is not a last step. It is part of every page from the start.

---

## 2. Read first

### 2.1 Files (I put them in `/docs`)

| File | What it is |
|---|---|
| `telning-design-system.zip` | The **website** design system: `tokens.css`, `tokens.json`, `components/*/README.md` + `preview.html`, `bundle.css`, `bundle.js`, `source/content2.py` (site data and strings). The live site is built with this. |
| `telning-design-system.md` (v2.0) | Design rules for the **printed books** (covers, pages, story card, illustrator rules). |
| `telning-research-guideline.md` | The evidence (section 3) and the claims list (section 4). |
| `wordless-coloring-stories-project-brief.md` | Brand, TADA method (3.8), story card (3.4), legal and safety rules (section 10). |

### 2.1b Image files I upload with this prompt

| File | What it is | Where the rules are |
|---|---|---|
| `founder-source.jpg` | The founder's portrait, 768 × 1365 px: a 3D-style illustration of Dr. John Muhammadi, head to waist, arms crossed, navy scrubs. | Section 4.2, page 4, "Founder note" |
| `pim-source.jpg` | Pim, 1408 × 768 px: full body, sitting, facing front, on a white background with a soft shadow. | Section 4.1, "Pim art" |

Both were made with an AI tool. Save them in the repo where source art lives, with these names. **You may edit and redesign both** so they fit the site: better quality, the paper style, the token colours. The rules for each are in the sections above. Always show me the original and your version side by side, and wait for my OK before you use the new version.

### 2.2 Which file wins

| Topic | Source of truth |
|---|---|
| Website look: colours, fonts, spacing, radius, shadows, components, motion classes | The zip (`tokens.css`, `tokens.json`, component READMEs). Fonts are Fraunces + Instrument Sans; colours are paper, cream, ink, red, forest, moss, gold, blush, rose, sky, sea. **Ignore the fonts and colours in the `.md` file for the web**; they are for print. |
| What we may say (claims) | Research guideline section 4 and brief section 7.8, plus the claims guard in section 4.1 of this prompt. |
| TADA content and the science | Guideline section 3, brief section 3.8. |
| Story card, children's data, legal | Brief sections 3.4 and 10; design system `.md` section 12. |
| Art | Objects, PimNote, ArtSlot and SeriesWorlds READMEs: objects and animals are decoration only; no page goes live with an empty art slot. **Change:** the READMEs say "code never draws Pim". Pim's art now exists (2.1b), so Pim comes from that art, in the ways allowed in 4.1 "Pim art". Code still never invents a different Pim or a series main character. Update the READMEs (section 7). |
| This prompt vs the docs | This prompt wins on the feedback items (for example: no language switch). Tell me which docs need an update, and update the component READMEs (section 7). |

### 2.3 Inventory to send me (15 lines or less)
- Stack: how pages are built (static HTML from the Python render? a framework?), hosting, build command.
- Where site data and strings live; where `formEndpoint` posts (it may be empty); whether the email sign-up works today.
- Every link in the header, footer and landing page, with its status: works / 404 / anchor / external.

---

## 3. Part A — Landing page feedback

For each item: what to do, how, and when it is done.

### A1. "Coming soon" on series cards and age cards (no navigation)
- All 12 series cards and the 3 age cards show the existing dark pill "Coming soon" (`tn-pill--dark`, string `series.coming`).
- They must not navigate. Render them as `<div>` / `<li>`, not `<a>`. Remove the links to `/series/*` and `/books?age=*`. Not in the tab order. No pointer cursor. Screen readers hear, for example: "Home & Hearts, Family & friends, coming soon".
- Keep the look and the gentle idle animation. Remove anything that says "click me" (lift, underline, strong hover tilt).
- Make it data-driven: a series card becomes a link only when its `status` is `out`; an age card only when that age group has at least one book out. Later we change data, not markup.
- Remove these URLs from the sitemap, footer, JSON-LD and anywhere else.
- **Done when:** click, tap or Enter on any of the 15 cards does nothing, and each card shows "Coming soon".

### A2. Remove two lines
- "Twelve little worlds, each with its own main character." (`series.text`)
- "Every book brings in all four skills. Decision intelligence leads: it is the main focus of our scientists." (`skills.text`)
- Remove the element too (no empty `<p>`), then fix the spacing between heading and content.

### A3. Text changes
- "Find a book by age" → **"Find by age"** everywhere: hero button (`hero.button`), section heading (`ages.h2`), any aria-label or title.
- "Baby and toddler" → **"Toddler"**: card name, aria-label ("Toddler, ages 0–3"), site data `AGES`.

### A4. Remove the language switch
- Remove "EN" from the header on desktop and in the phone menu. The site has one language.
- Remove the switch code path and any `hreflang` tags. Keep `<html lang="en">`.
- Site data: `languages: { "en": "ready" }`. Keep other language string files if they exist, but nothing shows.
- Check the header still looks balanced.

### A5. Scroll position: the header must not cover a section
Problem: after a click on an anchor link, the sticky header covers the top of the section.

Fix:
- Measure the real header height in JS with a `ResizeObserver` (it changes on phones and when the menu opens) and write it to `--header-h` on `<html>`.
- CSS: `html { scroll-padding-top: var(--header-h, 80px); }` and `[id] { scroll-margin-top: var(--header-h, 80px); }`.
- Every JS scroll (`scrollIntoView`, smooth scroll, the email block's `scrollIntoView({ block: 'center' })`) uses the same offset.
- Links from other pages to landing sections use `/#ages`, `/#series`, `/#skills`. When a page loads with a hash, scroll after fonts and images are ready, and check again after 300 ms in case the layout moved.
- The phone menu closes on a link click, then the page scrolls.
- After an anchor jump, move focus to the section heading (`tabindex="-1"`, `focus({ preventScroll: true })`).
- A link to a new page always opens at the top of that page. If the site is a single-page app, reset scroll on route change, but keep the browser's back/forward position.
- Reduced motion: jump, no smooth scroll.
- **Done when:** at 375, 768 and 1280 px, for every anchor link (header, footer, hero button, "How our books work"), the top edge of the section is at the bottom edge of the header (±1 px). Write a Playwright test for this.

### A6. "Meet the team" → "About us"
- Change the TrustBand link text (`trust.link`) to "About us". It goes to `/about`.

### A7. Hero: three colourful, illustrated covers
Now: three plain cream covers with an empty art frame. Wanted: three bright, joyful covers that look like real, premium children's books.

- Keep the BookCover structure, but redesign the face:
  - The whole cover in the series colour from site data: Home & Hearts (`red`), Star Hoppers (`sea-deep`), On the Move (`gold-light`). Follow the contrast rules in `tokens.json` (cream text on red and sea-deep, ink text on gold-light).
  - A full scene from the Objects library fills about 65% of the cover:
    - Home & Hearts: a house with a warm lit window, a cat, floating hearts, a small tree, the sun.
    - Star Hoppers: a rocket with a flickering flame, a planet with a ring, the moon, twinkling stars, a penguin.
    - On the Move: a road over a hill, a car with turning wheels, a plane, a hot-air balloon, clouds.
  - If an object is missing (stars, road), add it to the Objects library in the same paper style (lit, mid and shade tones).
  - The series name as the title, big and friendly, in the display font, on a cream title plate (text never sits on busy art).
  - Book details: the colophon in a corner, a spine edge on the left, thin page edges on the right and bottom, the token shadow. It must read as a real book.
  - Small motion: objects float or drift slowly; the covers keep the existing depth and tilt. Everything stops under reduced motion.
- Must read at small sizes: test with a cover 120 px wide.
- Not links (series are coming soon).
- Alt text, for example: "Cover of the Star Hoppers series: a rocket and a penguin in space".
- No Pim, no series main character, no fake book pages. Keep `coverImage` support: when the illustrator's cover exists, it replaces the code scene.
- Reuse this cover everywhere a cover appears on new pages.
- **Done when:** at 375 and 1280 px it looks like three real, bright children's books, and I approve the screenshot.

### A8. Footer: add LinkedIn, social links without boxes, smaller on phones
- Add LinkedIn beside Instagram and TikTok in the footer. Order: Instagram, TikTok, LinkedIn.
- URL: `https://www.linkedin.com/company/telning`. Put it in site data (for example `social.linkedin`), next to the Instagram and TikTok links. Do not hard-code it.
- The LinkedIn icon matches the other two: same size, line weight and colour. Same link behaviour as the other two. aria-label: "Telning on LinkedIn".
- **No boxes:** remove the border, background and shadow around each social link. Show only the icon (plus the name, if the other links show it now) in ink colour. Hover: colour change only (for example to `red`). Keep the visible focus ring for keyboard users.
- The tap area stays at least 44 × 44 px (invisible padding), even when the icon is smaller.
- **Phone view** (the small breakpoint in `tokens.css`): the whole footer is smaller and more compact:
  - Text one step smaller in the type scale.
  - Less space between columns, rows and sections.
  - Social icons smaller (for example 20 px instead of 24 px).
  - The three social icons sit in one row.
  - Use token values only. No new sizes or colours.
- **Done when:** at 375 px the footer looks lighter and shorter, with three small icons in one row and no boxes; at 1280 px the three icons sit side by side with no boxes; all three links open the right page; I approve the screenshots.

### A9. Landing page: put Pim in
- Wherever the landing page has a Pim note (PimNote), a Pim avatar slot or hidden Pim art, show the Pim art (4.1 "Pim art"). Use the portrait variant in PimNote.
- Not on the three hero covers (A7): the series have their own main characters.
- **Done when:** no Pim slot on the landing page is empty or hidden, and I approve the screenshot.

---

## 4. Part B — New pages

### 4.1 Rules for every new page

**Look**
- Same header and footer as the landing page. Same tokens, fonts, components and Objects library. No new colours or fonts.
- Colourful but calm: paper background, one strong colour field per section, flat paper tones (lit, mid, shade). No gradients, no stock photos, no photos of children, no AI images. Two approved exceptions, both from files I upload (2.1b): the founder's portrait on `/about` (4.2, page 4) and the Pim art (below).
- Premium: generous space between sections (`--s7` to `--s9`), text no wider than `--text-max`, large display type, careful details (paper edges, layered depth). Every page opens with its own hero scene in the paper-theatre style (like Stage), made for that page's topic.
- Trustworthy: plain facts, sources, honest limits, real names only when real, clear privacy words, a way to contact us.
- One H1 per page. H2 for sections. Paragraphs of three sentences or fewer. Text left-aligned.

**Pim art (new)**

Pim is our character. The file `pim-source.jpg` (2.1b) is Pim. Keep Pim exactly this character: a small hedgehog-like creature; cream body with tiny white sparkles; soft green leaf-shaped spines; three glowing gold stars on the head; one blue eye open, one eye winking; rosy cheeks; a small smile; sitting, facing front.

- **Prepare the master.** Cut Pim out of the white background. Remove the painted shadow (make a paper shadow in code instead). Clean edges around the spines and the stars. Export a transparent WebP (plus PNG if needed), file name `pim-telning-character.webp`.
- **Paper version.** Also trace Pim into an SVG in the site's flat paper style: lit, mid and shade tones from the tokens (moss and forest for the spines; cream and gold for the body and stars; sky for the eye; blush for the cheeks). Same shape, same stars, same wink, same cheeks. This is the version to prefer on the site, because it scales to any size and sits well beside the Objects. Show me the SVG next to the original before you use it.
- **Poses.** From the same character you may make up to three poses: portrait (head and shoulders), full body sitting (as in the file), and peeking from behind something (for the 404 page). Pim must stay recognisable. Show me all poses before use.
- **Where Pim goes** (every place that was empty or had a fallback because Pim did not exist):
  - `/pim`: the hero and the page. Delete the easel-and-cloth fallback.
  - PimNote on every page: the portrait variant as the avatar.
  - The story card (5.4): small portrait beside Pim's two lines.
  - `/send`: Pim sits beside the mailbox and takes the drawing; the story card flies back from Pim.
  - 404 page: Pim peeks from behind the signpost (not a fox).
  - The landing page (A9).
  - OG image for `/pim`.
- **Where Pim does not go:** the hero covers (A7); inside the child's crayon drawing on `/tada`; any legal page.
- **Motion:** one small idle motion on Pim at most (the stars twinkle, or a slow blink). Nothing else moves on Pim. Stops under reduced motion.
- **Alt text:** "Pim, the Telning character: a small hedgehog with green spines and three gold stars on its head, winking." Shorter on repeats (`alt="Pim"`), or `aria-hidden="true"` when Pim is decoration next to the same name in text.
- **Honesty.** The Pim file was made with an AI tool. So, until I confirm something else: do not write "hand-drawn", "drawn by hand" or "Illustrated by …" about Pim anywhere. `/pim` section 2 ("How Pim is made by hand") is off by default (flag `pim.handDrawn: false`). The promise "no AI pictures inside" stays about the **books** only.

**Motion: illustrations that move with scroll**
- Each page has **one signature scroll story** (listed per page in 4.2): a scene that changes as the reader scrolls. Do not add "fade up" to every block; that looks generic. Other sections get small idle motion on one or two objects at most.
- Build: CSS scroll-driven animations (`animation-timeline: view()` / `scroll()`) with a small JS fallback (IntersectionObserver + `requestAnimationFrame` writing a progress variable `--p` from 0 to 1). Add it to `bundle.js` as `Telning.initScrollStory`. No big animation library unless the repo already has one.
- Animate only `transform` and `opacity`. No layout shift. Smooth on a mid-range phone.
- `prefers-reduced-motion`: show the final state, no motion (as in the existing CSS).
- Phones: fewer objects (`tn-hide-sm`), shorter scenes, no pointer depth.
- Content is never hidden behind animation. Text is readable with JS off.
- UI controls keep `--move` (220 ms). The scroll stories are an approved exception to "movement slow and small": slow, soft, playful.

**Words**
- British spelling. Simple English: short sentences, everyday words. Imagine a parent on a phone at night.
- All new copy goes into the strings file and is marked draft (`STRINGS_DRAFT`) for a person to check.
- Pim's lines: first person, 14 words or fewer, about choosing. Never a claim, never health advice (PimNote README).

**Claims guard (very important)**

Allowed: the list in guideline section 4 and brief 7.8.

Never write: proven, clinically tested, clinically proven, science-backed, evidence-based (about our book), boosts / builds / improves / develops (a skill), calming, reduces anxiety, stops tantrums, therapy, therapist-approved, Social Story, for autism, for ADHD, guaranteed, first ever, first of its kind, the only book, doctor-approved, doctor-recommended, recommended by doctors, made by a doctor, any number from a study.

How to say what we want, safely:

| What we want to say | What to write |
|---|---|
| "The first ever kids' book where children choose the ending" | **Not true**: choose-your-own-ending books for children already exist (for example Draw Story colouring books). Write: "A new kind of picture book: a wordless story your child colours, then finishes by choosing the ending, or by drawing their own." Add the flag `claims.firstApproved` (default `false`). Only when it is `true`, also show: "We have not found another book that brings all of this together: a wordless story, colouring, a chosen ending and a talk guide for grown-ups." |
| "Our scientific TADA approach, after a deep meta-analysis and clinical and behavioural experience" | "TADA is our own way to talk about a story. Our cognitive and behavioural scientists built it after a careful review of the research, including meta-analyses and trials on shared reading, wordless books and talking about feelings, and from our clinical and behavioural work with children and families." The last part comes from site data `team.experienceLine` and shows only when `teamCreditOn` is `true`. Ask me to confirm it is true. |
| "Decision intelligence is our focus" | Describe what the child does: sees the choices, thinks about what could happen, picks one, says why. It is our design focus. Never promise a result. |
| "Supports emotional intelligence, social and behavioural skills" | "Every story makes room to talk about feelings, friends and trying a new way." |

- Add a `claims-lint` script to the build/CI. It fails if a banned phrase is in the built HTML. Allow "SEL" only on `/teachers`.

**Tech and quality**
- SEO for every page: follow Part D (section 6). It is a priority, not an extra.
- WCAG 2.1 AA: contrast from `tokens.json`, visible focus ring, full keyboard use, alt text, decorative SVG with `aria-hidden="true"`, form labels and error messages in words.
- Lighthouse on mobile for every page: Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO 100. Inline SVG only above the fold; lazy-load the rest.
- All text and links are in the HTML the server sends. Works without JS (except upload and preview in the form).
- No empty art slots. If an art file is missing, design around it (see `/pim`).

### 4.2 The pages

#### 1. `/tada` — The TADA way (the most important page)
Purpose: show that TADA is our own approach, built from research and clinical and behavioural work; show why it matters and what is new.

Sections:
1. **Hero.** H1 "TADA: Talk, Ask, Decide, Act". Line: "Our own way to turn a picture book into a real talk with your child." Scene: four big paper letters T, A, D, A standing on a hill like a small stage.
2. **How we built it.** The safe sentence from the claims guard. Then three simple steps: we read the research (meta-analyses and trials) → we added what we learned in clinical and behavioural work → we made it four easy steps for home. No numbers.
3. **Why it matters: the science in plain words.** Short cards, each with a source link:
   - The talk matters most. Children who talked about feelings after a story understood feelings better than children who heard the same stories without that talk (Grazzani & Ornaghi 2011).
   - Talking *with* a child helps more than reading *to* a child. Large reviews of dialogic reading agree (Mol et al. 2008; Dowdall et al. 2020).
   - No words means more talk. With wordless books, parents ask more open questions and children say more (Chaparro-Moreno et al. 2017; Petrie et al. 2023; Murphy et al. 2025).
   - One picture at a time. Young children learned more words when one picture was shown at a time (Flack & Horst 2018). That is why our books have one picture per sheet.
   - Simple pages help attention. Busy, decorated rooms pulled young children's attention away (Fisher, Godwin & Seltman 2014). So our pages stay simple.
4. **What is new in TADA.**
   - Decide is a step of its own. The story stops at a fork: two endings, side by side. Your child chooses and says why. There is no wrong answer.
   - The child talks most. The grown-up asks, waits, and adds one word.
   - Act takes the story into real life ("What would you do?"), and your child draws their own ending.
   - The loop closes: you send the drawing, we send a story card and ideas for your next talk.
   - Wordless, so it works in any language spoken at home.
   - Decision intelligence at the centre, with feelings, friends and new ways to act woven in.
5. **The four steps, in depth.** For each step: who does it, what to do, three example sentences (guideline 3.2), one tip for a 2–3-year-old and one for a 5–7-year-old.
6. **Honest box: "What research shows, and what it does not show yet".** Effects of shared reading are small to medium and fade without practice, so short sessions, often, and read again. No study has tested choose-your-ending picture books yet; we use the fork to start a talk, and we are testing it with families.
7. **Sources.** Full citations from guideline sections 3.1, 3.2, 3.3 and 3.6, with DOI links where the guideline gives them. Check each link opens. Do not add studies that are not in the guideline. Collapsed on phones.
8. **Next step.** Button "Read the parent guide" (`/guide`); link "Send Pim your ending" (`/send`).

Signature scroll story: a paper road winds down the page. T and A appear as stops on the road. At D the road splits into two paths with a signpost (the choice). At the last A the paths meet at a picture frame, and a child-like crayon drawing (a sun, a house, scribbles; never Pim) draws itself with `stroke-dashoffset`.

#### 2. `/guide` — For grown-ups
Purpose: practical "how to read a Telning book together", plus the free guide.

Sections:
1. Hero: two small paper chairs side by side, an open book, crayons.
2. Before you start: 10–15 minutes, crayons or pencils, sit side by side, let your child hold the book.
3. The four steps, short (link to `/tada` for the why).
4. Questions that work: easy first (who, what, where), then feelings and why, then "When did you feel like that?".
5. By age: 0–3 (point and name; you do more of the talking), 3–5, 5–7 (your child tells the whole story and explains the choice).
6. Do and do not: do not quiz; do not correct the colouring; do not rush to the "right" ending; read it again; a few short sessions a week beat one long one.
7. Marker tip: "Crayons and pencils work best. If you use markers, put a sheet of paper behind the page."
8. Free guide: if `guidePdf` is set, email form then download; if not, "Get the guide by email when it is ready" (reuse EmailBlock with the tag `guide`).
9. FAQ: Which age? Do I need to read any words? My child only scribbles, is that OK? What if my child picks the "wrong" ending? Which pens?

Signature scroll story: an open book on a table. As you scroll, pages turn (3D `rotateY`) and each page shows one step's object: a speech bubble (Talk), a question bubble (Ask), the signpost (Decide), a crayon (Act).

#### 3. `/send` — Send Pim your ending
Purpose: explain, then the form (Part C).

Sections:
1. Hero: a paper plane carrying a drawing to a mailbox.
2. How it works, three steps: take a photo of the drawing page → fill in a short form → get a story card and talk ideas by email within `storyCardReplyTime`.
3. Example story card, made from a sample drawing that is clearly labelled as a sample. No real child.
4. The form (section 5.1).
5. Privacy in plain words (section 5.2), link to `/childrens-privacy`.
6. FAQ.

Signature scroll story: a drawing slides into an envelope, the envelope folds into a paper plane and flies to Pim, who sits beside the mailbox; a story card flies back from Pim.

Also update the landing line `send.small` if it no longer matches the form.

#### 4. `/about` — About us
Sections:
1. Hero: "Little stories for growing minds" with a sapling scene.
2. **A note from our founder** (new). It replaces "Why we started", because the note tells that story. Full details in "Founder note" below.
3. Who we are: the Telning team of cognitive and behavioural scientists. Team cards from site data `team[]` (name, role, short bio, optional photo of the adult). If empty, show the team line only. Do not show the founder again as a team card. **Never invent people, names, degrees or photos.**
4. How a Telning book is made: research → story script → hand-drawn by our illustrator → tested with families → printed.
5. Our promises: honest words; hand-drawn books with no AI pictures inside; children's privacy; quiet emails, only when a book is out.
6. The name: "Telning" is Swedish for a young shoot; in older Swedish it also means "a child". Made in Sweden.
7. Contact: `contactEmail` (if empty, ask me).

Signature scroll story: a seed beside the timeline grows into a shoot, gets a new leaf at each step, and becomes a small tree at the end.

##### Founder note (section 2 of `/about`)

Purpose: a parent meets a real, kind person behind Telning. It reads like a short letter, not a CV.

**Site data** (new object `founder`; nothing hard-coded in the markup):

| Key | Value |
|---|---|
| `founder.name` | "Dr. John Muhammadi" |
| `founder.firstName` | "John" |
| `founder.role` | "Founder" |
| `founder.credentials` | "Medical doctor and cognitive scientist" |
| `founder.linkedin` | `https://www.linkedin.com/in/muhammadi-bg/` (my personal profile; the footer keeps the company page from A8) |
| `founder.email` | `john@telning.com` |
| `founder.portrait` | path to the finished portrait file |
| `founder.portraitAlt` | "Illustrated portrait of Dr. John Muhammadi, founder of Telning: a smiling man with glasses and a moustache, in navy scrubs." |

**Copy** (draft; put it in the strings file as `STRINGS_DRAFT`, I will check it):

> **H2:** A note from our founder
>
> Hello, I'm John.
>
> I am a medical doctor and a cognitive scientist. The question I love most is a simple one: how do we decide? And the people I love working with most are children.
>
> Children choose all day long. Which shoe goes on first? Share the toy, or keep it? Small choices, but they feel big when you are small.
>
> That is why I started Telning. Our books have no words, so the story belongs to you and your child. You look, you talk, you wonder together. Then your child decides how it ends. There is no wrong answer.
>
> I cannot promise what a book will do for your child. I can promise that we make each one with care, with honest words, and with respect for your family.
>
> Thank you for being here. If you have a question or an idea, please write to me. I would love to hear from you.
>
> Warmly,
> John
>
> **Under the sign-off (small):** Dr. John Muhammadi · Founder, Telning Publishing House · Medical doctor and cognitive scientist

Copy rules:
- Tone: friendly and kind, first person, like a letter to one parent. About 150 words. You may polish the words, but keep the meaning and the length.
- Do not add facts about John that are not in this prompt (years of work, hospitals, universities, awards, patients). If you think a fact would help, ask me.
- "Medical doctor" is a fact about John. It is never a reason to buy and never a health promise. No health advice in the note. The note goes through `claims-lint` like every other text.

**Portrait: prepare the source file**

The source is `founder-source.jpg` (2.1b): a 3D-style illustration of John, head to waist, arms crossed, navy scrubs. The scrubs carry embroidered text: "Dr. John M." and, under it, "Telning Publishing House". **This text is correct. Keep it visible; do not crop it out.** (The short name on the scrubs is fine next to the full name in the text.)

| Problem | Fix |
|---|---|
| The grey-white checkerboard is **part of the picture** (a JPG has no transparency). | Cut John out of the background. Clean edges on hair, glasses, ears and the folded arms. No checkerboard pixel may stay. |
| The file is small (768 px wide). | Do not just upscale a raster. Show it at 320 px wide or less, or make the paper version (below), which scales to any size. |

Crop: from just above the hair to just under the folded arms, so the chest text stays in. If a tighter crop looks better, it still has to include the chest text.

**Portrait: you may redesign it**

The portrait is glossy 3D; the site is flat paper. Choose one of these, or try both and show me:
1. **Frame it** (quick): the cut-out inside a paper frame (details below).
2. **Redraw it** (better): trace John into the site's flat paper style, as with Pim: lit, mid and shade tones from the tokens; same hair, glasses, moustache, smile, navy scrubs, crossed arms and the chest text. He must stay recognisable as the same person. No new facial features, no change of expression, no new AI image.

Show me the original and your version side by side at 1280 px, and wait for my OK.

**Portrait: make it fit the design system**

The portrait is glossy 3D; the site is flat paper. Do not fight that, frame it:
- Put the cut-out inside a paper frame: an arched paper window (a small paper-theatre stage) on one colour field from the tokens. Try `gold-light` and `sky`; pick the one where the navy scrubs and the dark hair have the best contrast.
- The frame has a paper edge and the token shadow. A paper shape (a low hill or the frame's bottom edge) covers the bottom of the crop, so the cut looks planned.
- Two or three Objects around the frame, in paper tones: the sapling leaf, a small heart, a crayon. They may overlap the frame edge a little for depth.
- The frame may tilt up to 2°, like a picture pinned to paper.
- Motion: small idle motion on one or two Objects only (a leaf sways). The portrait itself does not move. Stops under reduced motion. The seed-to-tree scroll story stays the only signature story on this page.
- If the portrait still looks out of place after this, tell me and show me the screenshot.

**Layout**
- 1280 px: two columns. Left: the portrait frame, with a small caption under it. Right: the note on a cream "letter" card with a paper edge, no wider than `--text-max`.
- 375 px: the portrait frame first (about 200 px wide, centred), then the note. No sideways scroll.
- Markup: a `<section aria-labelledby>` with the H2; the portrait in a `<figure>` with a `<figcaption>`: "John, founder of Telning. Illustrated portrait." The note is real text in the HTML, never an image.
- Sign-off "Warmly, John" in the display font (italic). No new handwriting font.

**Links under the note**
- LinkedIn: the same icon as in the footer (A8), with the text "John on LinkedIn". It opens `founder.linkedin` with `rel="me noopener"`. aria-label: "John on LinkedIn".
- Email: the address as visible text, as a `mailto:` link to `founder.email`.
- Both: tap area at least 44 × 44 px, visible focus ring, colour change on hover only.
- `/privacy` must say what happens to emails people send us: used only to reply, never added to the email list.

**Tech**
- Export: SVG for the paper version; otherwise WebP with real transparency (plus a PNG fallback if the stack needs one). File name in words: `dr-john-muhammadi-telning-founder.webp` (or `.svg`). Aim for under 60 KB.
- `width` and `height` set (no layout shift), `loading="lazy"`, `decoding="async"`. It is not the LCP element.
- Structured data: see 6.5.

**Done when:** at 375 and 1280 px the block reads like a warm letter from a real person; the portrait has a clean cut-out with no checkerboard and the chest text readable; it sits naturally beside the paper art; both links work; the copy passes `claims-lint`; I approve the screenshots.

#### 5. `/pim` — Meet Pim
Sections:
1. Who Pim is: the Telning character who speaks for us. Draft copy (ask me to confirm; the old line "Pim is white, so your child gives Pim colour" came from the brief and does not match the Pim art): "Pim is a small hedgehog with three stars on its head. Pim loves to listen, to wonder, and to choose. In every Telning book, Pim is there to ask: what would you do?"
2. How Pim is made by hand: pencil → ink → page. "Illustrated by {illustratorName}". **Off by default** (`pim.handDrawn: false`), see "Pim art" in 4.1. Show it only when I confirm it is true.
3. Pim's letters and story cards (with the Pim portrait).

Art: the Pim art (4.1), full-body pose in the hero, on a paper hill with a few Objects (stars, a leaf). Delete the easel-and-cloth fallback. No empty art slots.

Signature scroll story: a crayon scribble slowly fills a big paper leaf (the shoot) as you scroll: "Your child adds the colour."

#### 6. `/teachers` — For teachers
Sections:
1. Hero: a classroom shelf and children's drawings on a string.
2. Why wordless works in class: every child can join, whatever language they speak at home.
3. TADA for the classroom: whole class, small group, one-to-one. Short how-to.
4. Topics: feelings, friends, choices, everyday life. "SEL" is allowed here. Not "CASEL-aligned" unless I confirm it.
5. "Speech therapists often use wordless books" is allowed. Nothing about autism or therapy.
6. Teacher pack coming soon: sign-up (EmailBlock with the tag `teacher`).
7. No promises about copying pages or licences (ask me).

Signature scroll story: children's drawings clip onto a string one by one.

#### 7. `/privacy`, `/childrens-privacy`, `/terms`
- Calm reading pages: a small paper scene at the top (a closed envelope with a leaf seal), a table of contents, short sections, "Last updated" date.
- `/privacy`: the website, the email list, and emails people send us (for example to the founder).
- `/childrens-privacy`: the story-card form: what we collect, why, how long we keep it, who processes it (host, email service, AI provider if used), your rights, contact.
- `/terms`: WelloWork AB named in full here (the only place, apart from the copyright line).
- Write a clear draft from brief section 10 and the real data flow from Part C. Show "Draft: needs a legal check" in staging only.
- Never invent a company number, address, data protection officer or a service we do not use. Use site data placeholders; the production build fails if a legal placeholder is empty.

#### 8. 404 page
Must return the HTTP status 404 (not 200).
Pim peeking from behind a signpost (the peeking pose from 4.1 "Pim art"): "This path is not ready yet." Links to the home page, `/tada` and `/send`.

#### Coming-soon routes
Do not build `/series/*` or `/books?age=*` now. If someone opens one, return the 404 page with status 404. Do not redirect them to the home page (Google sees that as a "soft 404").

---

## 5. Part C — "Send Pim your ending": form, story card, talk-next note

### 5.1 The form
One page, short and friendly, in three parts with a progress line.

**Part 1 — The drawing (required)**
- Grown-up's email (to send the card).
- Child's first name. Hint: "First name only."
- Child's age (select, 1–10).
- Which book: from site data `books` with status `out`, plus "Other". If no book is out yet, tell me; use the series list in staging only.
- Which ending did your child choose? Ending 1 / Ending 2 / They drew their own.
- Photo of the drawing page: jpg, png, heic or webp, max 10 MB. Hint: "Only the drawing, please. No people in the photo." Simple preview with rotate and crop.

**Part 2 — Talk about the story (all optional)**

Above the questions, a clear box titled "Why we ask these questions":

> These questions are optional. Your answers help us write ideas that fit your child's story: what to ask next and how to keep the talk going. We use your answers once, to write your tips. We do not save them. We never use them to test, judge or diagnose your child, and we never share them. You can skip every question and still get a story card.

Questions (short; chips plus a small text box of 300 characters max):
1. The story's world: "What did your child say about the place where the story happens?"
2. Feelings in the story: "How did your child think the main character felt?" Chips: happy, sad, angry, worried, scared, surprised, calm, proud, other.
3. Your child's feelings: "How did your child feel at the start of the story, and at the end?" Same chips in two rows: start / end.
4. The choice: "Why did your child choose this ending?"
5. Real life: "Did your child talk about a time they felt like this, or what they would do?"
6. "Anything else you noticed?"

**Part 3 — Consent**
- [required] I am the child's parent or guardian, and I am over 18.
- [required] You may use the first name, age and drawing to make the story card.
- [required only if any Part 2 answer is filled in] You may use my answers once to write tips for our next talk. (Explicit consent: information about a child's feelings is special-category data under GDPR.)
- [optional, not ticked by default] You may share the story card (first name, age and drawing only) on Telning's Instagram and TikTok.
- Link to `/childrens-privacy`.

Button: "Send to Pim". Thank-you state: "Pim has your drawing! Look in your email within {storyCardReplyTime}."

### 5.2 Data rules (must be true in the code)
- Part 2 answers are never written to a database, file, log, analytics tool or error tracker. They stay in memory, are used once to write the note, then are gone. Scrub request bodies from server logs and error tracking (for example Sentry `beforeSend`). No analytics events with field values.
- The drawing: strip EXIF and GPS data on the server. Delete it within 30 days at most; delete it right after sending if there is no share consent. With share consent, keep only the story card image, never the answers.
- Email, first name and age: kept only as long as needed to send. Do not add the parent to the email list unless they tick a separate box.
- Write a test that proves answers are not stored or logged: submit a unique token inside the answers, then search logs, database and storage for it.
- The privacy words on `/send` and `/childrens-privacy` must describe the real flow, including every service that touches the data. If the code and the words differ, tell me; one of them must change.
- Spam: honeypot field, rate limit per IP, check the file type by its content, not only its extension.
- Image check (auto mode): if the photo shows a person or a face instead of a drawing, reject it kindly: "We can only take a photo of the drawing. Please take a new photo without people in it."

### 5.3 Two modes (config `storyCard.mode`)
- **`manual`** (to start): the submission goes to the team inbox (`storyCard.inbox`) as one email. A person makes the card and writes the note, within 24 hours. The privacy text says: your answers are sent to our team by email, used to write your tips, and the email is deleted after we reply.
- **`auto`**: a server function calls the Claude API (key in an environment variable, server-side only, never in the browser) to write Pim's two lines and the talk-next note, renders the card image on the server, and emails the parent. Check docs.claude.com for the current model name and the API's data retention, and describe it honestly in the privacy text.
- Both modes use the same form and the same templates.

### 5.4 The story card (image, 1080 × 1350 px)
- Follow design system `.md` section 12, using the **website** tokens and fonts: paper background; the drawing in a white frame with an ink line and round corners, top two thirds; "A TADA ending by {Name}, {age}" in the display font; two lines from Pim (Pim's voice rules); footer with the logo lockup on the left and `@telning.pub` and `#TADAstory` on the right; a strip in the book's or series' colour at the bottom.
- Pim's small portrait (the portrait pose from 4.1 "Pim art") beside Pim's two lines.
- First name and age only. Never a photo of a child.

### 5.5 The talk-next note (in the email, under the card)
Short, simple English, warm:
1. One line about what your child did, specific to the drawing and answers (no big praise).
2. "Next time, try asking:" three questions: one for Talk, one for Ask (feelings or why), one for Decide ("What if…?"). Easy first, then harder. Matched to the child's age.
3. "Try it in real life:" one small Act idea.
4. "A tip for you:" one tip for the grown-up (for example: wait five seconds after a question).
5. Fixed last line: "These are general ideas, not advice about your child's health or development. If you are ever worried, talk to your child's doctor or health nurse."

Rules for whoever writes it (a person or the AI):
- No labels, no diagnosis, no scores, no "normal / not normal", no comparing with other children, no claims, no advice on health, sleep, medicine or behaviour problems.
- If the answers show worry about safety, harm or health: no tips. Send the card and a short, kind note pointing to their doctor or the local emergency number.
- In auto mode, put these rules in the system prompt and check the output before sending (length, banned words, the fixed last line). If the check fails, fall back to manual.

### 5.6 The email
- Subject: "Your story card from Pim".
- The card image (attached and inline), the note, the line "We have deleted your answers." (true by design), and a link to `/guide`.
- Simple layout that works in Gmail and Apple Mail. No tracking pixels.

---

## 6. Part D — SEO for Google and AI engines (priority)

### Problem
Telning is new, and "telning" is also a normal Swedish word. Google and AI engines (ChatGPT, Perplexity, Claude, Gemini, Copilot) do not know who we are or what our pages answer.

### Solution
Fast pages with all text in the HTML. One clear topic per page. Words that answer parents' real questions. Structured data, sitemap and robots.txt. Google Search Console and Bing set up, with a step-by-step list for me.

### Outcome
Every page is indexed in Google. AI engines can read, understand and quote our pages. Search Console shows no errors.

### 6.1 Rule
SEO is built into every page from the start. A page is not ready for my review until it passes the checklist in 6.10.

### 6.2 Crawlable pages (most important for AI engines)
- All text and links are in the first HTML the server sends (static or server-rendered). Many AI crawlers do not run JavaScript. Test every page with `curl`: the main text must be in the output.
- SVG scenes and animations are fine, but real text never lives only inside SVG or JS.
- Collapsed content uses `<details>`, so it stays in the HTML.
- Real links (`<a href>`), not click handlers.
- One URL per page. Pick one host (check which is live: `telning.com` or `www.telning.com`) and 301-redirect the other; redirect `http` to `https`; one trailing-slash style, redirect the other.
- The 404 page returns status 404. Coming-soon URLs return 404.
- Staging and preview sites: `noindex` (meta tag and `X-Robots-Tag` header). Production: never `noindex`. Add a build check for both.

### 6.3 On every page
- A unique `<title>`, 60 characters or fewer: main words first, "| Telning" last.
- A unique meta description, 140–160 characters: what the parent gets from this page.
- One H1 that matches the page's main question. Where it fits, H2s are real questions parents ask ("What is dialogic reading?").
- The first paragraph answers the main question in two or three sentences.
- Canonical URL, Open Graph and Twitter card tags, one OG image per page (1200 × 630).
- Alt text that describes the picture (not a list of keywords). Image file names in words.
- Internal links: each page links to two or three related pages with clear link text (never "click here"). Breadcrumbs on inner pages.
- A visible "Last updated" date on `/tada`, `/guide` and the legal pages.
- Landing page: do not change the H1 "Little stories, growing minds." without my OK. Put the search words in the title, the meta description and the first paragraph. You may suggest a better H1.

Starting titles (drafts; improve them with the keyword map, then show me):

| Page | Title | Main search intent |
|---|---|---|
| `/` | Telning: picture books where your child chooses the ending | books where children choose the ending; feelings books for kids |
| `/tada` | TADA: talk about picture books with your child \| Telning | how to talk with my child about a story; dialogic reading |
| `/guide` | How to read a picture book with your child \| Telning | reading together tips; questions to ask when reading |
| `/send` | Send Pim your child's ending, get a story card \| Telning | brand and QR-code visitors |
| `/about` | About us: the scientists behind Telning books | who makes Telning; can I trust it |
| `/pim` | Meet Pim, the hand-drawn Telning character | brand |
| `/teachers` | Wordless picture books for the classroom \| Telning | wordless books for teaching; SEL activities |
| legal pages | Privacy notice \| Telning, and so on | navigation only |

### 6.4 Keyword map (show me before you write page copy)
- One main search intent per page, plus three to five related phrases.
- Start from what parents search: problems and questions, for example "how to talk to my child about feelings", "books about feelings for toddlers", "wordless picture books", "dialogic reading at home", "choose your own ending book for kids", "decision making for kids", "colouring story book".
- If you can browse, use Google autocomplete and "People also ask" for ideas. I will check search volumes in Search Console and Keyword Planner later.
- Natural text first. No keyword stuffing. No thin pages made only for a keyword.
- Spelling: our copy is British ("colouring"), but most US parents search "coloring". Suggest how to handle it (for example one natural "colouring (coloring)" in a FAQ answer and a meta description) and ask me.
- Titles, descriptions and schema text also go through `claims-lint`.

### 6.5 Structured data (JSON-LD)
Describe only what is visible on the page. Validate with Google's Rich Results Test and validator.schema.org.
- Every page: `Organization` (name "Telning Publishing House", alternateName "Telning", url, logo, `sameAs` Instagram, TikTok and LinkedIn (`https://www.linkedin.com/company/telning`), plus the Amazon author page when it exists), defined once with an `@id` and referenced elsewhere; `WebSite`; `WebPage` (or `AboutPage`); `BreadcrumbList` on inner pages.
- `/tada` and `/guide`: `Article` with author (the Organization, or real people when real), `datePublished`, `dateModified`; on `/tada`, `citation` for the studies.
- FAQ sections: `FAQPage`. Google now shows FAQ rich results only for a few big health and government sites, so this is for clarity, not for extra space in Google.
- `/about`: `Person` only for real team members with their real job titles. The founder is real: one `Person` with an `@id`, `name` "Dr. John Muhammadi", `jobTitle` "Founder", `description` (`founder.credentials`), `image`, `worksFor` → the Organization `@id`, `sameAs` → `founder.linkedin`. Add `founder` → this Person on the `Organization`. Do not put the email address in JSON-LD.
- Books, later: prepare a `Book` template (name, isbn, bookFormat, inLanguage, typicalAgeRange, illustrator, publisher, a link to Amazon). Render it only when a book is out.
- Never fake reviews or ratings.

### 6.6 sitemap.xml and robots.txt
- `sitemap.xml` is made by the build: only canonical, indexable pages with status 200. `lastmod` is the real date the content changed (not the build time). No coming-soon or 404 URLs.
- `robots.txt`: allow everything except private paths (form endpoint, admin). Last line: `Sitemap: https://telning.com/sitemap.xml` (with the chosen host).
- AI crawlers:
  - Allow the search and answer bots: `Googlebot`, `Bingbot`, `Applebot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Perplexity-User`, `Claude-SearchBot`, `Claude-User`.
  - Training bots (`GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`): my decision. Default: allow, and ask me. Note: blocking `Google-Extended` does not remove us from Google Search or AI Overviews.
  - Bot names change. Check each company's current docs before you write the file.
- Check that the host or CDN firewall does not block these bots (for example, Cloudflare has a setting that blocks AI bots). Tell me what you find.
- Add `/llms.txt`: a short Markdown file with who we are and our main pages, one line each. It costs little; not every engine reads it yet.

### 6.7 Speed (Core Web Vitals, mobile)
- LCP under 2.5 s, INP under 200 ms, CLS under 0.1.
- The hero heading is usually the LCP: never delay it with an animation. Preload the display font.
- Every scene and image box has a fixed size, so nothing jumps.
- Scroll stories never block taps or typing.

### 6.8 Words that AI engines quote and parents trust
- One-sentence definitions near the top of key pages: "TADA is…", "Telning is…", "Pim is…". Use the same names everywhere.
- Short paragraphs that each answer one question on their own.
- Facts with named, linked sources (on `/tada`).
- Who wrote it: "By the Telning team of cognitive and behavioural scientists", plus reviewer names when they are real.
- Say "Telning Publishing House" or "Telning books" near the top of key pages, so engines know which Telning we are.
- The same brand facts everywhere. Write me a short "brand facts" text (two versions: 150 characters and 300 characters) for the Instagram and TikTok bios, the LinkedIn page "About" text and, later, the Amazon author page.

### 6.9 Google Search Console and Bing
In the code:
- Search Console: the best way is a Domain property verified by DNS (I do that). If I give you a verification code instead, add the meta tag or HTML file.
- The same for Bing Webmaster Tools.
- IndexNow (used by Bing and others): add the key file and send changed URLs on each deploy.
- Analytics: add no new tracking scripts without my OK; our site promises no cookies. Search Console needs no code on the page after verification.

For me: write `docs/seo-launch.md`, simple steps with checkboxes:
1. Search Console: add the Domain property `telning.com` and verify with a DNS TXT record.
2. Submit the sitemap.
3. URL Inspection: "Request indexing" for the home page and each new page.
4. After one to two weeks: check Pages (fix "Discovered" or "Crawled – currently not indexed"), Enhancements (structured data), Core Web Vitals and HTTPS.
5. Bing Webmaster Tools: import the site from Search Console and submit the sitemap. Bing's index is also used by some AI assistants.
6. Every month: look at the Search results report (queries and pages) and tell Claude Code which pages to improve.

### 6.10 SEO checklist for every page (automate in CI where you can)
- [ ] Main text and links are in the `curl` HTML.
- [ ] Unique title (60 characters or fewer) and meta description (140–160).
- [ ] One H1.
- [ ] Canonical points to itself, on the chosen host.
- [ ] In `sitemap.xml` with a real `lastmod`.
- [ ] JSON-LD parses, validates and matches the visible content.
- [ ] Open Graph tags and image.
- [ ] No `noindex` in production; `noindex` on staging.
- [ ] At least two internal links in and two out.
- [ ] Alt text on every meaningful image.
- [ ] Lighthouse SEO 100 and Core Web Vitals targets met.
- [ ] `claims-lint` passes, including titles, descriptions and schema.

---

## 7. Final checks before you say "done"

- [ ] A1–A8 checked, with screenshots at 375, 768 and 1280 px.
- [ ] The anchor-offset Playwright test passes.
- [ ] Link check over the whole site: no 404s; `/series/*` and `/books?age=*` are not linked.
- [ ] `claims-lint` passes.
- [ ] Reduced motion: all motion stops and all content is visible.
- [ ] Keyboard-only run through every page and the form.
- [ ] Lighthouse targets met on every page (mobile).
- [ ] Privacy test passes: answers are not stored or logged.
- [ ] No empty art slots and no placeholders in production.
- [ ] Founder note on `/about`: clean portrait cut-out (no checkerboard, chest text kept), LinkedIn and email links work, the `Person` JSON-LD validates, I approved the screenshots.
- [ ] Pim: the same character everywhere (`/pim`, PimNote, story card, `/send`, 404, landing); no easel fallback left; nothing on the site says Pim is hand-drawn unless I confirmed it; I approved the paper version and the poses.
- [ ] The SEO checklist (6.10) passes on every page. `robots.txt`, `sitemap.xml` and `llms.txt` are live. `docs/seo-launch.md` is written.
- [ ] Docs updated: Header README (no language switch); Footer README (LinkedIn added, social links without boxes, smaller footer on phones); SeriesWorlds, AgeStrip and Pill READMEs ("Coming soon", not links); LandingPage README (new text and order); TrustBand README ("About us"); PimNote, ArtSlot and Objects READMEs (Pim art exists; how to use it; still never invent a different Pim); one README per new page or component; a short note for `telning-design-system.md` section 14 (web motion exception, no language switch).
- [ ] A short report to me: Problem / Solution / Outcome, then the list of things I must decide or confirm.

---

## 8. Ask me, do not guess

- Other team members' names, roles, bios and photos (the founder's details are in 4.2, page 4), and the team experience line (is "clinical and behavioural work with children and families" true for our team?).
- Founder: whether `john@telning.com` is also the site's general `contactEmail`.
- Founder portrait: frame it or redraw it in the paper style (show me both if you can).
- Pim: confirm the new "Who Pim is" copy; whether Pim's "made by hand" section may go on (only if an illustrator really drew Pim); confirm the paper SVG version and the poses.
- AI art and honesty: both image files were made with an AI tool. Default: the promise "no AI pictures inside" is about the **books** only; the founder caption says "Illustrated portrait"; nothing says Pim is hand-drawn. Tell me if you want different words.
- `contactEmail`, `illustratorName`, `guidePdf`, and legal details (company number, address).
- Story card mode (`manual` or `auto`), the team inbox, and which email service to use.
- Whether `claims.firstApproved` can be `true` (only after we check Swedish, German and Nordic shops as well as English ones).
- Teacher pack: may teachers copy pages for their class?
- Which host to keep: `telning.com` or `www.telning.com`.
- Training bots: allow or block?
- Search Console and Bing verification (DNS, or a code for you).
- The Amazon author page URL, when it exists.
- How to handle "colouring" vs "coloring" for US searches, and whether to change the landing H1.
