# Notes for `telning-design-system.md` (print design system v2.0), section 14 "Website"

The website follows the **web** design system (the zip: Fraunces + Instrument Sans, the paper/cream/ink/red/forest
tokens), not the colours and fonts in section 14 of the print document. Three things to add to section 14:

1. **No language switch.** The site has one language (English). German and Swedish string files exist with empty
   values; nothing shows until a person writes them and marks the language `ready`.
2. **Web motion exception.** The rule "movement slow and small (200 ms)" applies to controls. Each inner page has one
   signature scroll story (a scene that changes as the reader scrolls) and small idle motion on one or two objects.
   Everything stands still under `prefers-reduced-motion`, and the final state is always visible without JavaScript.
3. **Pim art exists.** Pim on the website comes from the approved Pim file (paper SVG, three poses). Code never
   invents a different Pim. The "Pim is white, the child gives Pim colour" line from section 6 is about the printed
   books; on the website Pim is the sandy, leaf-spined, three-star character. Nothing on the site says Pim is
   hand-drawn until the owner confirms it (`pim.handDrawn`).

Also: ages on the site are 0–3 Toddler, 3–5 Preschool, 5–7 Early school (the print documents say 3–7 for the
books; the owner keeps the 0–3 card on the site).
