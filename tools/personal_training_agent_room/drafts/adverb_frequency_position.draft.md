# adverb_frequency_position

Jesse rewrite for `adverb_frequency_position`.

## Scope

- Keep the MVP contract and exact contrast set.
- Replace internal grammar-label teaching with chunk-based copy.
- One learner problem only: the learner knows `always/often/never`, but places them by Russian word order.

## Chunk map

- Simple action: `I always drink`, `They usually work`, `He often calls`.
- With `is/are/am`: `She is always late`, `They are usually busy`.
- With `have`: `I have never seen this film`.
- With `should/can`: `You should always check`, `We can usually help`.
- Negative trap: `never` already carries “not ever”, so no `doesn't never`.
- Flexible start: `Sometimes I work late`.

## Required anchors

- `freq_easy_001`: wrong `drink always` feedback must contain `always drink`.
- `freq_contrast_001`: wrong `always is` feedback must contain `is always`.
- `freq_mixed_003`: wrong `doesn't never` feedback must contain `двойное`.
