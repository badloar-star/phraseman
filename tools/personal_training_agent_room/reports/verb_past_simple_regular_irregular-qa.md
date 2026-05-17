# verb_past_simple_regular_irregular QA

Status: PASS

Files checked:

- `app/diagnosis_training_verb_past_simple_regular_irregular.ts`
- `app/personal_training_taxonomy.ts`
- `admin/personal-trainings.js`
- `tests/trainer_modes.test.ts`

Jesse checklist:

- App file contains `JESSE_REWORKED_PERSONAL_TRAINING`.
- Taxonomy contains `entry('verb_past_simple_regular_irregular', 'active', 'PASS')`.
- Training status is `active`.
- Category remains `verb`.
- Priority remains `25`.
- Supported locales remain `ru` and `uk`.
- Existing MVP contrast set remains intact.
- There are 6+ examples.
- There are 12+ steps.
- Required step ids remain present.
- Required wrong-feedback substrings remain present:
  - `worked`
  - `went`
  - `studied`
  - `did go`
  - `bought`
- Smart Trainer config keeps `source: diagnosis_training`, `microDiagnosisId: verb_past_simple_regular_irregular`, `minItems: 12`, `recommendedItems: 20`.
- Guided mode remains enabled.
- Distractor-specific feedback remains enabled.

Copy QA:

- RU/UK learner-facing copy teaches one live contrast: completed past action must be visible in the verb.
- RU/UK display text avoids internal labels such as `subject`, `object`, `main verb`, `base verb`, and `modal`.
- The lesson stays focused on regular `-ed`, core irregular forms, spelling traps, past markers, and the `did go` / `did went` boundary.

Verification commands:

- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --testNamePattern "verb Past Simple regular and irregular diagnosis training follows the MVP content contract" --no-cache --runInBand --silent`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --no-cache --runInBand --silent`
