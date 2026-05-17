# verb_present_simple_vs_continuous

Status: Jesse reworked

Scope: one repair only. The learner can make both `I work every day` and `I am working now`, but chooses between them by translation instead of meaning.

Main learner pain:

- `I am working every day.`
- `I work now.`
- `She is liking coffee.`
- `The bus is leaving at 8, but we wait now.`
- `I work on a new project this month` when the intended meaning is temporary/current.

Jesse model:

- First choose meaning:
  - normally / habit / fact / schedule / stable taste
  - now / right now / at the moment / temporary current situation
- Ready contrast:
  - `I work every day`
  - `I am working now`
- Stable taste:
  - `He likes coffee`
- Schedule:
  - `The train leaves at 8`
- Temporary current situation:
  - `I am working on a new project this month`

Not in scope:

- full tense system
- all state-verb exceptions
- advanced future use of Present Continuous
- spelling rules for all `-ing` forms
- deep third-person `-s` lesson beyond what the contrast needs

Published app file:

- `app/diagnosis_training_verb_present_simple_vs_continuous.ts`

Registry:

- `app/personal_training_taxonomy.ts`
- status: `active`
- QA: `PASS`

Protection marker:

`JESSE_REWORKED_PERSONAL_TRAINING`

Contract notes:

- Keep contrast set exactly:
  - `present simple`
  - `present continuous`
  - `habit`
  - `current action`
  - `state verbs`
  - `temporary situation`
  - `time markers`
- Keep required step ids:
  - `ps_pc_easy_001`
  - `ps_pc_easy_002`
  - `ps_pc_contrast_004`
  - `ps_pc_mixed_006`
- Keep required feedback substrings:
  - `Every day`
  - `Now`
  - `likes`
  - `are waiting`

Copy rule:

- RU/UK display text should teach meaning first, not internal grammar taxonomy.
- It is okay for skipped technical fields such as `contrastSet`, `smartTrainerConfig`, `targetSkill`, and ids to keep contract terms.
