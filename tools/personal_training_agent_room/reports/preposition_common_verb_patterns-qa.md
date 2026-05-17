# QA Report: preposition_common_verb_patterns

## Verdict

PASS.

## Scope check

- One diagnosis id only: `preposition_common_verb_patterns`.
- Replaced in place: `app/diagnosis_training_preposition_common_verb_patterns.ts`.
- Added taxonomy entry as `active` / `PASS`.
- No neighboring preposition trainings were edited.

## Content check

- The training focuses on one learner problem: losing the small tail after common actions.
- Main chunks:
  - `listen to`
  - `wait for`
  - `depend on`
  - `look at`
  - `look for`
  - `talk to`
  - `talk about`
  - `think about`
  - `ask for`
  - `believe in`
- Required tested steps are present:
  - `verb_prep_easy_001`
  - `verb_prep_easy_002`
  - `verb_prep_contrast_001`
  - `verb_prep_contrast_002`
  - `verb_prep_mixed_006`
- Required feedback substrings are preserved:
  - `listen to music`
  - `wait for me`
  - `depend on`
  - `Look for`
  - `to, for, to`
- Every wrong option has specific feedback.
- Retry feedback has four levels.
- Guided mode is enabled.
- Smart Trainer config is present.

## Risk check

- No external claims.
- No fake facts.
- RU/UK learner text avoids forbidden English grammar labels.
- Existing app/test contract preserved.

## Required checks

Run after this draft:

- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- targeted `trainer_modes.test.ts` for `preposition common verb patterns diagnosis training follows the MVP content contract`
- full `tests/trainer_modes.test.ts`
