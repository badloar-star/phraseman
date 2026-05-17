# reported_speech_basic

Jesse rework pass for basic reported speech: `said that`, `told me`, `asked if`, and reported question order.

## Scope

- One microdiagnosis only: `reported_speech_basic`.
- Preserve the existing MVP contract ids and contrast sets.
- Replace English-only learner copy with RU/UK ASCII transliteration.

## Teaching Point

The learner should stop copying the quote literally:

1. Statement -> `said that he was`
2. Tell needs someone -> `told me that`
3. Yes/no question -> `asked if I was`
4. Where/what/when question -> normal order: `where I lived`
5. Common shifts: `I am` -> `he was`, `will` -> `would`, `can` -> `could`

## Copy Rules

- Visible RU/UK copy uses ASCII transliteration.
- Avoid learner-facing raw labels like `object`, `subject`, or `base verb`.
- Contract contrast labels remain unchanged because tests assert them.

## Structure

- Easy: `I am` -> `he/she was`, `will` -> `would`.
- Contrast: `told me`, `asked if`, `could`, `had finished`.
- Mixed: `where I lived`, `what I wanted`, paired corrections.
