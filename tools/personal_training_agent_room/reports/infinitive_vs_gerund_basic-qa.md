# infinitive_vs_gerund_basic QA

QA status: PASS

Scope checked:
- Replaced legacy/English-heavy training in `app/diagnosis_training_infinitive_vs_gerund_basic.ts`.
- Added Jesse marker.
- Added taxonomy entry as `active/PASS`.
- Preserved MVP contract id, priority, supported locales, contrast set, mastery rules, smart trainer config, guided mode, and fallback route.

Content checks:
- Single topic: choosing the second action form through ready verb chunks.
- Required anchor steps are present:
  - `inf_ger_easy_001`
  - `inf_ger_contrast_004`
  - `inf_ger_contrast_005`
  - `inf_ger_mixed_006`
- Every wrong option has RU/UK/ES feedback.
- Every step has four retry hints through the shared helper.
- RU/UK learner-facing copy avoids forbidden internal grammar labels and explains through ready chunks.

Verification commands:
- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- targeted `trainer_modes.test.ts` for `infinitive vs gerund diagnosis training follows the MVP content contract`
- full `trainer_modes.test.ts`

Result:
- PASS after local verification.
