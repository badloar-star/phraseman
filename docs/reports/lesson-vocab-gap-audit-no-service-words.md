# Lesson Vocabulary Gap Audit (No Service Words)

## Rule Applied

- Include all **new meaningful words** that first appear in lesson phrases.
- Exclude service words (articles, prepositions, conjunctions, pronouns, auxiliary verbs).
- If a word appeared in an earlier lesson, do not require it again in later lesson dictionaries.

## Data Sources

- Phrase data: `app/lesson_data_1_8.ts`, `app/lesson_data_9_16.ts`, `app/lesson_data_17_24.ts`, `app/lesson_data_25_32.ts`
- Lesson dictionaries: `app/lesson_words.tsx`

## Normalization

- Tokens are compared case-insensitively.
- Verb forms are normalized to base-like form (`calls` -> `call`, `washes` -> `wash`).
- Noun plurals are normalized (`dishes` -> `dish`, `taxes` -> `tax`).

## Result

Only 2 lessons have missing words under this rule.

### Lesson 3: Missing 20 words

- london
- coffee
- speak
- english
- eat
- book
- write
- letter
- dish
- dinner
- strange
- teach
- math
- key
- wear
- pizza
- take
- great
- tea
- good

### Lesson 5: Missing 20 words

- much
- use
- mask
- sell
- ticket
- pay
- cash
- smoke
- risk
- lose
- money
- cold
- change
- price
- need
- credit
- card
- rule
- tax
- mistake

