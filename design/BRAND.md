Telning Publishing House makes picture books for children from 0 to 7. **Decision intelligence is the heart of every book**: the child sees the choices, thinks about what could happen and picks one. Every book also brings in **emotional intelligence, social skills and behavioural skills**. Decision intelligence is the main focus of the Telning team of scientists and the brand's difference: it leads every page, headline and story. Every book belongs to one **series** (its own world and main character) and fits one **age** (0–3, 3–5, 5–7). **Pim** is the Telning character, the brand's narrator: Pim greets, explains, writes the letters and signs the story cards. Pim belongs to no series.

The look is a **paper theatre**: a premium publisher (Fraunces, warm paper, ink, a red colophon) with playful depth. Flat paper shapes sit in layers with soft shadows; they move a little with the pointer and the scroll; cards tilt; book spines slide out; small objects float, drift, drive and fly.

## Rules

1. **Objects and cute animals, never characters.** Code may draw the paper objects and decorative animals in this system (balloons, cars, blocks, the signpost, the fox, the owl…; animals with simple dot eyes). Never a series main character or a book page: those come from the human illustrator, through art slots. Pim comes from the approved Pim art (`art/pim/`, `Pim.astro`); code never invents a different Pim.
2. **Decision intelligence first.** It is named first and shown biggest wherever skills appear. The other three skills sit beside it, never above it.
3. **Pim speaks for Telning.** First person, warm, one short sentence, about choosing. Pim never makes a claim and never gives advice about a child's health.
4. **Safe words only** (see Words). Describe what the child does; never promise a result.
5. **Text on light grounds.** `ink` on `paper`, `cream`, `white`, `blush`, `sky`, `gold`, `gold-light`, `moss`, `rose`; `cream` on `ink`, `forest`, `red`, `red-deep`, `sea-deep`. Never text on `sea` or on an object.
6. **Legal name.** Every page says "Telning Publishing House". The footer's bottom line reads "© 2026 WelloWork AB, Telning Publishing House"; otherwise "WelloWork AB" appears only on Terms, Privacy and the children's privacy notice.
7. **QR pages are clean.** `/guide` and `/send` (printed in the books): no shop links, no prices, none of these words: gift, reward, prize, win, free. Printed addresses never change.
8. **Children's data.** Forms are for grown-ups: first name, age, parent email, the drawing. No photos of children. No cookies, trackers or pixels.
9. **Motion is gentle and optional.** Slow, small, never flashing. Everything stands still under `prefers-reduced-motion`; nothing is hidden if scripts fail.
10. **Placeholders are for building.** The site does not go live with an empty art slot.

## Voice and words

Warm, clear, a little playful; short sentences; no hype, no health words, no big numbers. Say "grown-ups" in headings. The site tagline is "Little stories, growing minds."; the book tagline "Stories your child finishes."

You may use: "Decision intelligence at the heart." · "Every story is built around decision intelligence." · "Your child makes the choices." · "Two endings to choose from, plus a page to draw your own." · "Talk about feelings together." · "Made for talking together." · "Hand-drawn by [name]." · "Screen-free." · "Created by the Telning team of cognitive and behavioural scientists." · "Every Telning book is created by our team of cognitive and behavioural scientists." · "Made by scientists, made for play." · "Decision intelligence is the main focus of our scientists."

Never use: proven, clinically tested, science-backed, makes your child smarter, raises IQ, builds or boosts any skill, boosts vocabulary, builds language skills; calming, reduces anxiety, mindful colouring, stops tantrums; Social Story, therapy, for autism, for ADHD, therapist-approved; the first book of its kind, best, number one, award; any number from a study; treats, cures, medical, diagnosis; TwentyThird, day-23. Say "feelings and life skills", not "SEL", except on `/teachers`.

## Colour

`paper` is the page; `cream` lifts cards and covers; `ink` is text and the main button. `red` is the signature (the colophon, link underlines, TADA letters, accents); `forest` holds the TADA band and the footer; `gold`, `blush`, `sky`, `moss`, `rose` and `sea` give the series and objects their colour. Each colour has lit and shaded tones (`red-light`/`red-deep`, `gold-light`/`gold-deep`, `forest-light`, `sky-light`, `sea-deep`, `paper-deep`) used only to give objects volume.

## Type

Fraunces 600 (`display`) for headings, age numbers, spine names and the wordmark; Fraunces 400 for quiet statements. Instrument Sans 400 and 600 (`text`) for everything else. `display-xl` 96/64/40 px for the H1, `display-l` 60/44/28 px for H2s, `display-m` 26/24/19 px for card headings, `lead` 20/17 px, `body` 18/16 px (desktop/phone), `kicker` 13 px capitals in `red-deep`. Left-aligned. German runs about 30% longer: every box must hold it. Font files live in `fonts/` (SIL Open Font License); never load them from Google.

## Depth, shape, motion

Corners: `radius-l` (28) for big cards, bands and the stage; `radius-m` (16) for TADA cards and slots; `radius-pill` for buttons, fields and pills. Shadows: `shadow-1` small, `shadow-2` cards and covers, `shadow-3` lifted and hover. Objects take a soft drop shadow. Layers carry a depth `--d`: deeper layers move more. Motion uses `move` (220 ms) and `ease`; loops are slow (6–80 s). Focus: a 3 px `sea-deep` ring with a 3 px gap.

## Logo

The colophon (an open book forming a "T" and a young tree, cream in a red rounded badge) with "Telning" in Fraunces 600 and "PUBLISHING HOUSE" in spaced Instrument Sans, set to the exact width of "Telning". Files in the asset group **Logo**. It goes on every spine and every cover.

## Series, ages, skills

Series (with the plain theme word shown under each name, for search): Home & Hearts (family & friends), Paws & Claws (animals), Star Hoppers (space), Little Gardeners (flowers & nature), Big Days (celebrations), The Toy Box (toys), Little Kitchen (food & cooking), Funny Pages (cartoons), Round the Year (months & seasons), Game On (sports), Everyday Heroes (superheroes), On the Move (cars, planes & balloons). Names live in the site data and can change; check each for trademarks before print. Ages: 0–3 Toddler, 3–5 Preschool, 5–7 Early school. Skills: Decision intelligence (the heart), then Emotional intelligence, Social skills, Behavioural skills.

## Components

Logo, Objects, PimNote, Button (and link), Pill, BookCover, BookCard, SeriesWorlds, AgeStrip, SkillHeart, Stage, TadaBand, TrustBand, ArtSlot, FormField, EmailBlock, Header, Footer; pages: LandingPage (desktop and phone). Plain HTML with the classes in `components/bundle.css` (prefix `tn-`) and the helpers in `components/bundle.js` (`window.Telning`: `init`, `initDepth`, `initTilt`, `initReveal`, `initMenu`, `initEmail`, `data`, `strings`). No framework.

## Site data and text

`src/data/site-data.json` holds every fact that can change (series, ages, skills, books, links, switches, founder, story-card settings); `src/data/strings.en.json` holds the shared English text and `src/data/pages/*.json` the page copy, marked draft until a person checks it (`strings.de.json`, `strings.sv.json` share the keys). The site has one language; there is no language switch.
