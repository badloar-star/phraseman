# word_order_basic_statement

Status: Jesse reworked

Scope: one repair only. The learner knows the words, but moves them too freely in a normal English statement.

Main learner pain:

- `Coffee I like.` instead of `I like coffee.`
- `I read at home books.` instead of `I read books at home.`
- `Every morning drinks he tea.` instead of `Every morning, he drinks tea.`
- `She always is busy.` instead of `She is always busy.`

Jesse model:

- Do not teach this as a table of internal labels.
- Teach it as a live frame:
  - who
  - action
  - what
  - where
  - when
- Time can move to the beginning, but the inside stays normal:
  - `Every morning, he drinks tea.`
- With `is/are`, words like `always` usually sit after `is/are`:
  - `She is always busy.`

Not in scope:

- questions
- inversion
- broad syntax theory
- all possible emphasis/fronting cases
- full adverb lesson

Published app file:

- `app/diagnosis_training_word_order_basic_statement.ts`

Registry:

- `app/personal_training_taxonomy.ts`
- status: `active`
- QA: `PASS`

Protection marker:

`JESSE_REWORKED_PERSONAL_TRAINING`

Contract notes:

- Keep training contrast set exactly:
  - `subject`
  - `verb`
  - `object`
  - `place`
  - `time`
  - `adverb position`
  - `Russian/Ukrainian flexible order`
- Keep Smart Trainer contrast set exactly:
  - `subject`
  - `verb`
  - `object`
  - `place`
  - `time`
  - `adverb position`
- Keep required step ids:
  - `word_order_easy_001`
  - `word_order_contrast_001`
  - `word_order_mixed_002`
  - `word_order_mixed_006`
- Keep required feedback substrings:
  - `I like coffee`
  - `I read books at home`
  - `She is always busy`
  - `I sent her the file`

Copy rule:

- RU/UK display text should avoid internal English grammar labels like `subject`, `object`, `main verb`, and `frequency adverb`.
- It is okay for skipped technical fields such as `contrastSet`, `smartTrainerConfig`, `targetSkill`, and ids to keep contract terms.
