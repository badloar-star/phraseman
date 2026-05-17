# noun_possessive_apostrophe_s

Jesse rework pass for possessive apostrophe training.

## Scope

- One microdiagnosis only: `noun_possessive_apostrophe_s`.
- Keep the MVP contract: category `noun`, priority `36`, locales `ru/uk`, 6+ examples, 12+ steps, guided recovery, mastery, Smart Trainer, and distractor-specific feedback.
- Preserve contract anchors:
  - `poss_s_easy_001`: wrong `John` feedback mentions `John's phone`.
  - `poss_s_contrast_002`: wrong `friend's` feedback mentions `friends'`.
  - `poss_s_mixed_001`: wrong `childrens'` feedback mentions `children's`.
  - `poss_s_mixed_006`: wrong sentence feedback mentions `friend's car`.

## Teaching Point

The learner should not think about apostrophe as punctuation first. They should find:

1. owner
2. thing
3. one owner or several owners

Then choose:

- `John's phone`
- `friend's car`
- `friends' car`
- `children's toys`
- `parents' house`

## Copy Rules

- Replaces mojibake RU/UK text with readable ASCII transliteration.
- Keeps tested English anchors exactly.
- Explains `'s` possession vs `'s = is`.

## Structure

- Easy: one owner names/common nouns.
- Contrast: `friend's` vs `friends'`, students, parents, of-phrase, `is` contraction.
- Mixed: `children's`, `men's`, contraction detection, pair repair, full sentence repair.
