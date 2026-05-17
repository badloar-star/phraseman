# modal_may_might_probability

Jesse rewrite for the personal training diagnosis `modal_may_might_probability`.

## Scope

- Keep the MVP id, category, priority, supported locales, contrast set, smart trainer config, guided mode, and required anchor steps.
- Rebuild the copy around one learner problem: learners use `can`, `will`, or `maybe` when the intended meaning is probability.
- Teach meaning first:
  - `may/might` = maybe / probability
  - `will` = more certain
  - `can` = often ability or general possibility
  - `may not / might not` = maybe not
  - after `may/might`, the action stays short: `may know`, `might come`

## Required anchors

- `modal_may_might_easy_001`: wrong `can` feedback must contain `may rain`.
- `modal_may_might_contrast_004`: wrong `knows` feedback must contain `may know`.
- `modal_may_might_mixed_002`: wrong `doesn't might` feedback must contain `might not work`.
- `modal_may_might_mixed_003`: wrong `She maybe come.` feedback must contain `She might come`.

## Step ladder

1. `may rain` for forecast probability.
2. `may be busy` for a guess.
3. `may help` for possible usefulness.
4. `might come` for cautious probability.
5. `might work`.
6. `might` vs `will`.
7. `may know`, not `may knows`.
8. `might be`, not `might is`.
9. `may know / might come`.
10. `may not know`.
11. `might not work`.
12. `maybe` vs `might`.
13. `can / may / will`.
14. positive and negative probability.
15. final sentence correction.

## QA notes

- Status moved to `active`.
- Jesse marker added.
- Supported locales remain `ru` and `uk`.
- Learner-facing RU/UK copy avoids internal grammar labels and teaches through ready chunks.
