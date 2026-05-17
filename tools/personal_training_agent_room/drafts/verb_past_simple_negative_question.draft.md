# verb_past_simple_negative_question

Status: Jesse reworked

Scope: one repair only. The learner knows past forms like `went` and `bought`, but uses those past forms after `did` or `didn't`.

Main learner pain:

- `Did you went?`
- `I didn't went.`
- `Did she called?`
- `She didn't called.`
- `I didn't bought the phone, but did you bought it?`
- `What did you bought?`

Jesse model:

- In a statement, the past is in the verb:
  - `I went`
  - `She called`
  - `They bought`
- In a question or negative, the past moves into `did` / `didn't`.
- After `did` / `didn't`, use the plain form:
  - `Did you go?`
  - `I didn't go.`
  - `Did she call?`
  - `She didn't call.`
  - `What did you buy?`

Not in scope:

- full Past Simple statements
- `was/were`
- modals
- Present Perfect
- `used to`
- advanced echo questions

Published app file:

- `app/diagnosis_training_verb_past_simple_negative_question.ts`

Registry:

- `app/personal_training_taxonomy.ts`
- status: `active`
- QA: `PASS`

Protection marker:

`JESSE_REWORKED_PERSONAL_TRAINING`

Contract notes:

- Keep contrast set exactly:
  - `did + base verb`
  - `didn't + base verb`
  - `past statement`
  - `past question`
  - `past negative`
  - `did vs do`
  - `base verb after did`
- Smart Trainer contrast set intentionally omits the last item, matching the MVP contract.
- Keep required step ids:
  - `past_neg_q_contrast_004`
  - `past_neg_q_contrast_006`
  - `past_neg_q_mixed_002`
  - `past_neg_q_mixed_006`
- Keep required feedback substrings:
  - `Did you went`
  - `Didn't bought`
  - `Where did she went`
  - `buy`

Copy rule:

- RU/UK display text should avoid internal English grammar labels like `subject`, `object`, `main verb`, `base verb`, and `modal`.
- It is okay for skipped technical fields such as `contrastSet`, `smartTrainerConfig`, `targetSkill`, and ids to keep contract terms.
