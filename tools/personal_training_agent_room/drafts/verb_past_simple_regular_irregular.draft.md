# verb_past_simple_regular_irregular

Status: Jesse reworked

Scope: one repair only. The learner talks about a completed past action, but leaves the verb in present form or invents a regular-looking form for an irregular verb.

Main learner pain:

- `Yesterday I work.`
- `Yesterday I go.`
- `I goed home.`
- `I buyed a phone.`
- `I did went home.`
- `studyed` / `stoped`

Jesse model:

- Past must be visible in the verb.
- Regular:
  - `work -> worked`
  - `open -> opened`
  - `call -> called`
- Spelling:
  - `live -> lived`
  - `study -> studied`
  - `stop -> stopped`
- Irregular:
  - `go -> went`
  - `see -> saw`
  - `buy -> bought`
  - `come -> came`
- Boundary:
  - normal statement: `I went`
  - emphatic with did: `I did go`
  - not `I did went`

Not in scope:

- full did/didn't question/negative training
- Present Perfect
- Past Continuous
- complete irregular verb table
- pronunciation of `-ed`

Published app file:

- `app/diagnosis_training_verb_past_simple_regular_irregular.ts`

Registry:

- `app/personal_training_taxonomy.ts`
- status: `active`
- QA: `PASS`

Protection marker:

`JESSE_REWORKED_PERSONAL_TRAINING`

Contract notes:

- Keep contrast set exactly:
  - `regular + ed`
  - `irregular past`
  - `y -> ied`
  - `double consonant + ed`
  - `past time marker`
  - `present simple`
- Keep required step ids:
  - `past_simple_easy_001`
  - `past_simple_contrast_001`
  - `past_simple_contrast_005`
  - `past_simple_mixed_002`
  - `past_simple_mixed_006`
- Keep required feedback substrings:
  - `worked`
  - `went`
  - `studied`
  - `did go`
  - `bought`

Copy rule:

- RU/UK display text should avoid internal English grammar labels like `subject`, `object`, `main verb`, `base verb`, and `modal`.
- It is okay for skipped technical fields such as `contrastSet`, `smartTrainerConfig`, `targetSkill`, and ids to keep contract terms.
