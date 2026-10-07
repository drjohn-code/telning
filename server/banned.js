// Banned claims and words (docs/telning-research-guideline.md section 4, the brief 7.8, design/BRAND.md "Never use",
// docs/telning-claude-code-prompt.md 4.1). Regular-expression sources, matched case-insensitively.
// Used by scripts/claims-lint.mjs (the built HTML) and by server/story-card.js (Pim's lines and the talk-next note).
export const BANNED = [
  // results and science words
  'proven', 'clinically tested', 'clinically proven', 'science[- ]backed', 'evidence[- ]based', 'research[- ]proven',
  'boosts?', 'boosting', 'builds', 'improves?', 'improving', 'develops', 'developing your child',
  'makes your child smarter', 'raises iq', 'boosts? vocabulary', 'builds language skills',
  // health words
  'calming', 'calms', 'reduces? anxiety', 'reduce[sd] anxiety', 'stops? tantrums', 'mindful(?:ness)? colou?ring',
  'therapy', 'therapists?[- ]approved', 'therapist', 'social stor(?:y|ies)', 'for autism', 'autism', 'autistic', 'adhd',
  'treats', 'cures', 'diagnosis',
  // hype
  'guaranteed?', 'first[- ]ever', 'first of its kind', 'the only book', 'the first book', 'number one', '#1',
  'award[- ]winning', 'bestseller', 'best[- ]selling', 'the best book',
  'doctor[- ]approved', 'doctor[- ]recommended', 'recommended by doctors', 'made by a doctor',
  // numbers from studies
  '\\bd\\s*=\\s*[0-9.]+', '\\bg\\s*=\\s*[0-9.]+', '\\bn\\s*=\\s*[0-9,]+', '\\d+\\s*%\\s*(?:of|more|better|fewer)',
  // other brands
  'twentythird', 'day-23', 'casel',
];

/** True when the text contains a banned phrase. */
export function hasBanned(text) {
  const t = String(text || '');
  return BANNED.some((src) => new RegExp(`(?<![\\w-])(?:${src})(?![\\w-])`, 'i').test(t));
}
