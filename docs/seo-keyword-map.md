# Telning keyword map (draft for John's OK)

Date: 8 October 2026. Source of ideas: Google autocomplete (real searches), the brief (parents search for the
problem, not for "wordless"), and the claims guard. Search volumes: check later in Search Console and Keyword Planner.

Rules: one main search intent per page; natural text first; no keyword stuffing; no page made only for a keyword.
Titles are 60 characters or fewer with the main words first and "| Telning" last. Descriptions are 140–160 characters.
Everything here goes through `claims-lint` (titles, descriptions and schema text are in the built HTML).

## Pages

| Page | Main search intent | Related phrases (3–5) | Title (chars) | H1 |
|---|---|---|---|---|
| `/` | picture books where children choose the ending | books about feelings for toddlers · wordless picture books for kids · children's books where you choose the ending · decision making for kids book · colouring story book for kids | Telning: picture books where your child chooses the ending (58) | Little stories, growing minds. (see note 1) |
| `/tada` | how to talk with my child about a story · dialogic reading | dialogic reading strategies · how to talk to your child about feelings · questions to ask your child after reading · dialogic reading books · talk about feelings with kids | TADA: talk about a picture book with your child \| Telning (56) | TADA: Talk, Ask, Decide, Act |
| `/guide` | how to read a picture book with your child | questions to ask when reading with your child · questions to ask your child when reading at home · reading with your toddler · how to read a wordless picture book · colouring story book for kids | How to read a picture book with your child \| Telning (52) | For grown-ups: how to read a Telning book together |
| `/send` | brand and QR-code visitors: "send Pim your ending" | Telning story card · TADA story · Pim Telning | Send Pim your child's ending, get a story card \| Telning (55) | Send Pim your ending |
| `/about` | who makes Telning; can I trust it | Telning Publishing House · Telning books Sweden · team of cognitive and behavioural scientists · founder of Telning | About us: the scientists behind Telning books (46) | Little stories for growing minds |
| `/pim` | brand: Pim, the Telning character | Pim Telning · Telning character · story card from Pim | Meet Pim, the Telning character who asks: what would you do? (59) | Meet Pim |
| `/teachers` | wordless picture books for the classroom | wordless picture books for preschoolers · social emotional learning picture books · SEL activities for kindergarten · wordless books for teaching · wordless picture books speech therapy (map only; the page says "speech therapists often use wordless books") | Wordless picture books for the classroom \| Telning (50) | Wordless picture books for the classroom |
| `/privacy` | navigation only | — | Privacy notice \| Telning | Privacy notice |
| `/childrens-privacy` | navigation only | — | Children's privacy notice \| Telning | Children's privacy notice |
| `/terms` | navigation only | — | Terms \| Telning | Terms |
| `/404` | — (not indexed) | — | Page not found \| Telning | This path is not ready yet. |

The meta descriptions live in `src/data/seo.json` (one place for titles, descriptions, dates and page type).

## What autocomplete told us

- "wordless picture books" is searched with: for kids, for toddlers, for preschoolers, speech therapy, pdf. So `/teachers`
  and `/tada` own "wordless picture books"; the home page says it once, naturally.
- Parents type "books about feelings for toddlers", "books about emotions for toddlers", "big feelings", "feelings book for
  3 year old". Those words belong on the home page and in the series copy, never as a promise ("helps with big feelings" is
  fine as a topic, "reduces" or "calms" is not).
- "children's books where you choose the ending" exists as a real search (small). It is our clearest difference, so it is
  in the home title.
- "dialogic reading" searches want the meaning and strategies: `/tada` section 3 answers "What is dialogic reading?" as an H2
  question.
- "questions to ask when reading with your child" is a strong, practical search: `/guide` section 4 uses that exact wording
  as its H2.
- "decision making for kids" is searched with book, activities, worksheet. The home and `/tada` pages say "decision
  making" in plain words next to "decision intelligence".
- Nobody searches "silent book" or "colouring story". Keep "colouring story book" as a description, not a heading.

## Two things to decide (section 8 of the brief)

1. **"colouring" vs "coloring".** Autocomplete shows both; US parents type "coloring". Google usually treats these as
   spelling variants, so we do not need two pages. Suggestion: British spelling everywhere on the site; the US spelling
   appears once, naturally, in the `/guide` FAQ answer about pens ("colouring (coloring) pencils") and once in the home
   page meta description. Nothing else changes. OK?
2. **Landing H1.** "Little stories, growing minds." stays unless you say otherwise. A stronger H1 for search would be
   "Picture books where your child chooses the ending", with "Little stories, growing minds." as the line above it.
   My advice: keep the tagline as the H1 (it is the brand) and let the title tag and the first paragraph carry the
   search words, which they now do.

## Brand facts (same words everywhere: Instagram and TikTok bios, LinkedIn "About", Amazon author page later)

**150 characters:**
Telning Publishing House makes wordless picture books for ages 0–7. Your child colours the story, chooses the ending and talks about it with you.

**300 characters:**
Telning Publishing House, Sweden, makes wordless picture books for children aged 0–7. Each story is coloured by the child, who then chooses how it ends, or draws their own ending. Our TADA way (Talk, Ask, Decide, Act) helps grown-ups turn the book into a real talk. Created by a team of cognitive and behavioural scientists.
