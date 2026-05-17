# verb_present_continuous_basic QA

Status: PASS

Files checked:

- `app/diagnosis_training_verb_present_continuous_basic.ts`
- `app/personal_training_taxonomy.ts`
- `admin/personal-trainings.js`
- `tests/trainer_modes.test.ts`

Jesse checklist:

- App file contains `JESSE_REWORKED_PERSONAL_TRAINING`.
- Taxonomy contains `entry('verb_present_continuous_basic', 'active', 'PASS')`.
- Training status is `active`.
- Category remains `verb`.
- Supported locales remain `ru`, `uk`, and `es`.
- Existing MVP contrast set remains intact.
- There are 6+ examples.
- There are 12+ steps.
- Required step ids remain present.
- Required wrong-feedback substrings remain present:
  - `am`
  - `I am working`
  - `is studying`
  - `Are you working`
  - `Every day`
- Smart Trainer config keeps `source: diagnosis_training`, `microDiagnosisId: verb_present_continuous_basic`, `minItems: 12`, `recommendedItems: 20`.
- Guided mode remains enabled.
- Distractor-specific feedback remains enabled.

Copy QA:

- RU/UK learner-facing copy teaches the live pair `am/is/are + -ing`.
- RU/UK display text avoids internal labels such as `subject`.
- The lesson stays focused on missing `am/is/are`, missing `-ing`, negative order, question order, and `now` vs `every day`.

Verification commands:

- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --testNamePattern "verb Present Continuous basic diagnosis training follows the MVP content contract" --no-cache --runInBand --silent`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --no-cache --runInBand --silent`
