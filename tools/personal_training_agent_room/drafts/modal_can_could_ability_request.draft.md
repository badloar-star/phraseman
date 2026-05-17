# modal_can_could_ability_request

Jesse rewrite for the personal training diagnosis `modal_can_could_ability_request`.

## Scope

- Keep the MVP id, category, priority, supported locales, contrast set, smart trainer contract, guided mode, and required anchor steps.
- Rebuild the copy around one learner problem: `can` and `could` are translated similarly, but English uses them for different time/tone signals.
- Teach meaning first:
  - `can` = ability now or direct request
  - `could` = past ability or polite request
  - `can't` = cannot now
  - `couldn't` = could not in the past
  - after `can/could`, the action stays short: `can speak`, `could help`

## Required anchors

- `modal_can_could_easy_001`: wrong `could` feedback must contain `can`.
- `modal_can_could_contrast_002`: wrong `to help` feedback must contain `could help`.
- `modal_can_could_contrast_004`: wrong `can` feedback must contain `could`.
- `modal_can_could_contrast_005`: wrong `can't` feedback must contain `couldn't`.

## Step ladder

1. Present ability with `can`.
2. `can` does not change with `she`.
3. `can't` for cannot now.
4. No `to/-s/-ing` after `can`.
5. No `to/-s/-ing` after `could`.
6. `she can speak`, not `she can speaks`.
7. Past ability with `could`.
8. Past negative with `couldn't`.
9. Present/past contrast pair.
10. Polite request with `Could you...?`.
11. Polite permission/request with `Could I...?`.
12. Direct request with `Can you...?`.
13. Mixed ability/request.
14. Mixed present/past/negative.
15. Final before/now correction.

## QA notes

- Status moved to `active`.
- Jesse marker added.
- Supported locales remain `ru` and `uk`.
- Learner-facing RU/UK copy avoids internal grammar labels and teaches through ready chunks.
