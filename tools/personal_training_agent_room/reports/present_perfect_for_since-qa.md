# present_perfect_for_since QA

QA status: PASS

Scope checked:
- Replaced legacy mojibake training in `app/diagnosis_training_present_perfect_for_since.ts`.
- Added Jesse marker.
- Added taxonomy entry as `active/PASS`.
- Preserved MVP contract id, priority, supported locales, contrast set, mastery rules, smart trainer config, guided mode, and fallback route.

Content checks:
- Single topic: `for + period` vs `since + start` in continuing Present Perfect situations.
- Required anchor steps are present:
  - `pp_for_since_easy_001`
  - `pp_for_since_contrast_001`
  - `pp_for_since_mixed_001`
  - `pp_for_since_mixed_006`
- All wrong answer options have RU/UK/ES feedback.
- Every step has four retry hints through the shared helper.
- RU/UK learner-facing copy avoids forbidden internal grammar labels.

Verification commands:
- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- targeted `trainer_modes.test.ts` for `Present Perfect for/since diagnosis training follows the MVP content contract`
- full `trainer_modes.test.ts`

Result:
- PASS after local verification.
