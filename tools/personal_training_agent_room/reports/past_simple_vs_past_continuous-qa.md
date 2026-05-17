# past_simple_vs_past_continuous QA

QA status: PASS

Scope checked:
- Replaced legacy English-only training in `app/diagnosis_training_past_simple_vs_past_continuous.ts`.
- Added Jesse marker.
- Added taxonomy entry as `active/PASS`.
- Preserved MVP contract id, priority, supported locales, contrast set, mastery rules, smart trainer config, guided mode, and fallback route.

Content checks:
- Single topic: choosing Past Simple vs Past Continuous by action role.
- Required anchor steps are present:
  - `past_simple_cont_easy_001`
  - `past_simple_cont_easy_002`
  - `past_simple_cont_contrast_002`
  - `past_simple_cont_mixed_005`
- Every wrong option has RU/UK/ES feedback.
- Every step has four retry hints through the shared helper.
- RU/UK learner-facing copy avoids forbidden internal grammar labels.

Verification commands:
- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- targeted `trainer_modes.test.ts` for `Past Simple vs Past Continuous diagnosis training follows the MVP content contract`
- full `trainer_modes.test.ts`

Result:
- PASS after local verification.
