# used_to_basic QA

QA status: PASS

Scope checked:
- Replaced legacy English-heavy training in `app/diagnosis_training_used_to_basic.ts`.
- Added Jesse marker.
- Added taxonomy entry as `active/PASS`.
- Preserved MVP contract id, priority, supported locales, contrast set, mastery rules, smart trainer config, guided mode, and fallback route.

Content checks:
- Single topic: `used to` for old habit/state that is different now.
- Required anchor steps are present:
  - `used_to_easy_001`
  - `used_to_easy_002`
  - `used_to_contrast_004`
  - `used_to_mixed_003`
- Every wrong option has RU/UK/ES feedback.
- Every step has four retry hints through the shared helper.
- RU/UK learner-facing copy avoids forbidden internal grammar labels.

Verification commands:
- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- targeted `trainer_modes.test.ts` for `used to diagnosis training follows the MVP content contract`
- full `trainer_modes.test.ts`

Result:
- PASS after local verification.
