# object_order_give_me_it

Status: Jesse reworked

Scope: one repair only. The learner knows the words in phrases like `give`, `send`, `show`, `buy`, `me`, `her`, `it`, but puts the two pieces after the action in a Russian/Ukrainian-like order.

Main trap:

- `give me the book` is fine when the thing is named fully.
- `give it to me` is the safer pattern when the thing is `it`.
- `send her the file` is fine when the thing is named fully.
- `send it to her` is the safer pattern when the thing is `it`.
- `buy it for me` uses `for`, not `to`.

Not in scope:

- broad word order
- pronoun case
- full preposition theory
- all double-object edge cases
- advanced dialect variation

Published app file:

- `app/diagnosis_training_object_order_give_me_it.ts`

Registry:

- `app/personal_training_taxonomy.ts`
- status: `active`
- QA: `PASS`

Protection marker:

`JESSE_REWORKED_PERSONAL_TRAINING`

Content contract:

- Keep contrast set exactly aligned with the trainer contract:
  - `verb + person + thing`
  - `verb + thing + to + person`
  - `verb + thing + for + person`
  - `give it to me`
  - `send it to her`
  - `buy it for him`
- Keep the required step ids:
  - `object_order_easy_001`
  - `object_order_contrast_004`
  - `object_order_mixed_001`
  - `object_order_mixed_005`
- Keep the required feedback phrases:
  - `give me the book`
  - `give it to me`
  - `buy it for me`
  - `Send it to her`

Jesse notes:

- Learner-facing RU/UK copy should avoid grammar labels like `object`, `noun`, `subject`, `main verb`, `base verb`.
- Explain the repair as "the thing is named fully" vs "the thing is it/them".
- Use concrete phrase pairs instead of terminology.
- Keep distractor feedback specific for each wrong route: wrong order, wrong `to/for`, or wrong `it` placement.
