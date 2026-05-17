# quantifier_some_any QA

QA status: PASS

## Files

- `app/diagnosis_training_quantifier_some_any.ts`
- `app/personal_training_taxonomy.ts`
- `admin/personal-trainings.js`
- `tools/personal_training_agent_room/drafts/quantifier_some_any.draft.md`
- `tools/personal_training_agent_room/reports/quantifier_some_any-qa.md`

## Contract

- Stable id: `quantifier_some_any`
- Category: `determiner`
- Version: `1.0.0`
- Status: `active`
- Priority: `18`
- Locales: `ru`, `uk`, `es`
- Training contrast set preserved:
  - `some`
  - `any`
  - `no`
  - `not any`
  - `someone/anyone`
  - `something/anything`
- Smart Trainer contrast set preserved:
  - `some`
  - `any`
  - `no`
  - `not any`
  - `something`
  - `anything`

## Jesse pass

- Replaced transliterated legacy copy with learner-facing RU/UK/ES text.
- Kept the lesson strictly about choosing by situation, not by translation.
- Preserved all test anchors:
  - `some_any_easy_003` wrong `some` feedback contains `any money`.
  - `some_any_contrast_004` wrong `any` feedback contains `some`.
  - `some_any_mixed_001` wrong `some` feedback contains `any`.
- Added Jesse marker at file top.
- Added taxonomy entry: `entry('quantifier_some_any', 'active', 'PASS')`.

## Verification

- `npm run training:personal:sync-admin` -> 44 Jesse reworked, 12 legacy need rework.
- `npm run training:personal:check` -> 5 suites / 15 tests passed.
- Targeted `trainer_modes.test.ts` contract -> 1 passed.
- Full `trainer_modes.test.ts` -> 164 passed.
