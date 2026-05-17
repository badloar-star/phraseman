# past_continuous_basic QA

QA status: PASS

Scope checked:
- Replaced legacy training in `app/diagnosis_training_past_continuous_basic.ts`.
- Added Jesse marker.
- Added taxonomy entry as `active/PASS`.
- Preserved MVP contract id, priority, supported locales, contrast set, mastery rules, smart trainer config, guided mode, and fallback route.

Content checks:
- Single topic: `was/were + -ing` for a process at a past moment.
- Required anchor steps are present:
  - `past_cont_easy_001`
  - `past_cont_contrast_004`
  - `past_cont_contrast_005`
  - `past_cont_mixed_005`
- Every wrong option has RU/UK/ES feedback.
- Every step has four retry hints through the shared helper.
- RU/UK learner-facing copy avoids forbidden internal grammar labels.

Verification commands:
- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- targeted `trainer_modes.test.ts` for `Past Continuous diagnosis training follows the MVP content contract`
- full `trainer_modes.test.ts`

Result:
- PASS after local verification.
