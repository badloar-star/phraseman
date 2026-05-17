# verb_past_simple_negative_question QA

Status: PASS

Files checked:

- `app/diagnosis_training_verb_past_simple_negative_question.ts`
- `app/personal_training_taxonomy.ts`
- `admin/personal-trainings.js`
- `tests/trainer_modes.test.ts`

Jesse checklist:

- App file contains `JESSE_REWORKED_PERSONAL_TRAINING`.
- Taxonomy contains `entry('verb_past_simple_negative_question', 'active', 'PASS')`.
- Training status is `active`.
- Category remains `verb`.
- Priority remains `37`.
- Supported locales remain `ru` and `uk`.
- Existing MVP contrast set remains intact.
- Smart Trainer contrast set matches the shorter MVP contract.
- There are 6+ examples.
- There are 12+ steps.
- Required step ids remain present.
- Required wrong-feedback substrings remain present:
  - `Did you went`
  - `Didn't bought`
  - `Where did she went`
  - `buy`
- Smart Trainer config keeps `source: diagnosis_training`, `microDiagnosisId: verb_past_simple_negative_question`, `minItems: 12`, `recommendedItems: 20`.
- Guided mode remains enabled.
- Distractor-specific feedback remains enabled.

Copy QA:

- RU/UK learner-facing copy teaches one live repair: after `did` / `didn't`, use the plain form.
- RU/UK display text avoids internal labels such as `subject`, `object`, `main verb`, `base verb`, and `modal`.
- The lesson stays focused on `Did you go?`, `I didn't go`, `What did you buy?`, and the `didn't bought` / `did you went` traps.

Verification commands:

- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --testNamePattern "verb Past Simple did/didn't diagnosis training follows the MVP content contract" --no-cache --runInBand --silent`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --no-cache --runInBand --silent`
