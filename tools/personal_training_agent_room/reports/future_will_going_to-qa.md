# future_will_going_to QA

QA status: PASS

Scope checked:
- Replaced legacy/English-heavy training in `app/diagnosis_training_future_will_going_to.ts`.
- Added Jesse marker.
- Added taxonomy entry as `active/PASS`.
- Preserved MVP contract id, priority, supported locales, contrast set, mastery rules, smart trainer config, guided mode, and fallback route.

Content checks:
- Single topic: choosing `will` vs `going to` by future meaning.
- Required anchor steps are present:
  - `future_easy_001`
  - `future_contrast_001`
  - `future_contrast_004`
  - `future_mixed_001`
  - `future_mixed_006`
- Every wrong option has RU/UK/ES feedback.
- Every step has four retry hints through the shared helper.
- RU/UK learner-facing copy is meaning-first and avoids internal labels except the required legacy `base verb` contract anchor, which is handled by copy sanitation.

Verification commands:
- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- targeted `trainer_modes.test.ts` for `future will/going to diagnosis training follows the MVP content contract`
- full `trainer_modes.test.ts`

Result:
- PASS after local verification.
