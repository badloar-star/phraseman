# verb_present_simple_vs_continuous QA

Status: PASS

Files checked:

- `app/diagnosis_training_verb_present_simple_vs_continuous.ts`
- `app/personal_training_taxonomy.ts`
- `admin/personal-trainings.js`
- `tests/trainer_modes.test.ts`

Jesse checklist:

- App file contains `JESSE_REWORKED_PERSONAL_TRAINING`.
- Taxonomy contains `entry('verb_present_simple_vs_continuous', 'active', 'PASS')`.
- Training status is `active`.
- Category remains `verb`.
- Priority remains `24`.
- Supported locales remain `ru`, `uk`, and `es`.
- Existing MVP contrast set remains intact.
- There are 6+ examples.
- There are 12+ steps.
- Required step ids remain present.
- Required wrong-feedback substrings remain present:
  - `Every day`
  - `Now`
  - `likes`
  - `are waiting`
- Smart Trainer config keeps `source: diagnosis_training`, `microDiagnosisId: verb_present_simple_vs_continuous`, `minItems: 12`, `recommendedItems: 20`.
- Guided mode remains enabled.
- Distractor-specific feedback remains enabled.

Copy QA:

- RU/UK learner-facing copy teaches the live contrast `usually/every day` vs `now/right now`.
- RU/UK display text avoids internal English grammar labels such as `subject`, `object`, `main verb`, `base verb`, and `modal`.
- The lesson stays focused on meaning-first choice: habit/fact/schedule/stable taste vs action now/temporary current situation.

Verification commands:

- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --testNamePattern "verb Present Simple vs Continuous diagnosis training follows the MVP content contract" --no-cache --runInBand --silent`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --no-cache --runInBand --silent`
