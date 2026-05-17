# QA Report: preposition_direction

## Verdict

PASS.

## Scope check

- One diagnosis id only: `preposition_direction`.
- Replaced in place: `app/diagnosis_training_preposition_direction.ts`.
- Did not touch protected sibling `preposition_direction_to_into_from`.
- Added taxonomy entry as `active` / `PASS`.

## Content check

- The lesson is focused on direction leftovers: `go home`, `to`, `into`, `onto`, `from`, `out of`.
- The learner-facing model is "draw the arrow", not a grammar lecture.
- Exercises progress from easy to contrast to mixed review.
- Required tested steps are present:
  - `prep_dir_easy_003`
  - `prep_dir_contrast_001`
  - `prep_dir_contrast_004`
  - `prep_dir_mixed_006`
- Each wrong option has specific feedback.
- Retry feedback has four levels.
- Guided mode is enabled.
- Smart Trainer config is present.

## Risk check

- No known fake claims or external facts.
- No broad personal-training rewrite outside the exact diagnosis id.
- Existing app/test contract preserved where tests rely on exact values.

## Required checks

Run after this draft:

- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- targeted `trainer_modes.test.ts` for `preposition direction diagnosis training follows the MVP content contract`
- full `tests/trainer_modes.test.ts`
