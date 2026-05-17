# verb_present_continuous_basic

Status: Jesse reworked

Scope: one repair only. The learner wants to talk about an action happening now, but drops one of the two required pieces.

Main learner pain:

- `I working now.`
- `She studying at the moment.`
- `I am work now.`
- `She is study at the moment.`
- `You are working now` used as a question instead of `Are you working now?`

Jesse model:

- For action now, English needs two pieces:
  - `am/is/are`
  - action with `-ing`
- Teach as ready pairs:
  - `I am working`
  - `She is studying`
  - `They are waiting`
- Negative:
  - `I am not working`
- Question:
  - `Are you working?`
- Contrast signal:
  - `now` -> `I am working now`
  - `every day` -> `I work every day`

Not in scope:

- full tense system
- Simple vs Continuous as a broad mixed lesson
- spelling rules for all `-ing` forms
- state verbs
- perfect/progressive combinations

Published app file:

- `app/diagnosis_training_verb_present_continuous_basic.ts`

Registry:

- `app/personal_training_taxonomy.ts`
- status: `active`
- QA: `PASS`

Protection marker:

`JESSE_REWORKED_PERSONAL_TRAINING`

Contract notes:

- Keep contrast set exactly:
  - `am + verb-ing`
  - `is + verb-ing`
  - `are + verb-ing`
  - `now`
  - `right now`
  - `at the moment`
  - `present simple`
- Keep required step ids:
  - `pc_basic_easy_001`
  - `pc_basic_contrast_004`
  - `pc_basic_contrast_005`
  - `pc_basic_mixed_002`
  - `pc_basic_mixed_005`
- Keep required feedback substrings:
  - `am`
  - `I am working`
  - `is studying`
  - `Are you working`
  - `Every day`

Copy rule:

- RU/UK display text should avoid internal English grammar labels like `subject`, `object`, `main verb`, `base verb`, and `modal`.
- It is okay for skipped technical fields such as `contrastSet`, `smartTrainerConfig`, `targetSkill`, and ids to keep contract terms.
