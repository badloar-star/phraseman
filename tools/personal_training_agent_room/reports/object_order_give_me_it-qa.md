# object_order_give_me_it QA

Status: PASS

Files checked:

- `app/diagnosis_training_object_order_give_me_it.ts`
- `app/personal_training_taxonomy.ts`
- `admin/personal-trainings.js`
- `tests/trainer_modes.test.ts`

Jesse checklist:

- App file contains `JESSE_REWORKED_PERSONAL_TRAINING`.
- Taxonomy contains `entry('object_order_give_me_it', 'active', 'PASS')`.
- Training status is `active`.
- Category remains `syntax`.
- Supported locales remain `ru` and `uk`.
- Contrast set matches the existing MVP contract.
- There are 6+ examples.
- There are 12+ steps.
- Required step ids remain present.
- Required wrong-feedback substrings remain present:
  - `give me the book`
  - `give it to me`
  - `buy it for me`
  - `Send it to her`
- Smart Trainer config keeps `source: diagnosis_training`, `microDiagnosisId: object_order_give_me_it`, `minItems: 12`, `recommendedItems: 20`.
- Guided mode remains enabled.
- Distractor-specific feedback remains enabled.

Copy QA:

- RU/UK learner-facing explanation avoids heavy grammar labels.
- The repair is taught through phrase pairs:
  - `give me the book` / `give it to me`
  - `send her the file` / `send it to her`
  - `buy it for me`
- The lesson stays focused on one mistake family: two pieces after an action, especially with `it`.

Verification commands:

- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --testNamePattern "object order diagnosis training follows the MVP content contract" --no-cache --runInBand --silent`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts --no-cache --runInBand --silent`
