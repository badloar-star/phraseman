# word_order_basic_statement QA

Status: PASS

Files checked:

- `app/diagnosis_training_word_order_basic_statement.ts`
- `app/personal_training_taxonomy.ts`
- `admin/personal-trainings.js`
- `tests/trainer_modes.test.ts`

Jesse checklist:

- App file contains `JESSE_REWORKED_PERSONAL_TRAINING`.
- Taxonomy contains `entry('word_order_basic_statement', 'active', 'PASS')`.
- Training status is `active`.
- Category remains `syntax`.
- Supported locales remain `ru` and `uk`.
- Existing MVP contract contrast sets remain intact.
- There are 6+ examples.
- There are 12+ steps.
- Required step ids remain present.
- Required wrong-feedback substrings remain present:
  - `I like coffee`
  - `I read books at home`
  - `She is always busy`
  - `I sent her the file`
- Smart Trainer config keeps `source: diagnosis_training`, `microDiagnosisId: word_order_basic_statement`, `minItems: 12`, `recommendedItems: 20`.
- Guided mode remains enabled.
- Distractor-specific feedback remains enabled.

Copy QA:

- RU/UK learner-facing copy is framed as `кто + действие + что/где/когда`.
- RU/UK display text avoids internal labels in the explanation surface.
- Technical contract terms are limited to skipped fields such as contrast sets and Smart Trainer payloads.

Verification commands:

- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --testNamePattern "basic statement word order diagnosis training follows the MVP content contract" --no-cache --runInBand --silent`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --no-cache --runInBand --silent`
