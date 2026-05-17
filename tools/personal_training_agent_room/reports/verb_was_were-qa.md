# verb_was_were QA

QA status: PASS

Scope checked:
- Replaced legacy mojibake/English-heavy training in `app/diagnosis_training_verb_was_were.ts`.
- Added Jesse marker.
- Added taxonomy entry as `active/PASS`.
- Preserved MVP contract id, priority, supported locales, contrast set, mastery rules, smart trainer config, guided mode, and fallback route.

Content checks:
- Single topic: past `be` as `was/were`.
- Required anchor steps are present:
  - `was_were_easy_001`
  - `was_were_contrast_001`
  - `was_were_contrast_004`
  - `was_were_mixed_001`
  - `was_were_mixed_003`
  - `was_were_mixed_006`
- Every wrong option has RU/UK/ES feedback.
- Every step has four retry hints through the shared helper.
- RU/UK learner-facing copy avoids forbidden internal grammar labels.

Verification commands:
- `npm run training:personal:sync-admin`
- `npm run training:personal:check`
- targeted `trainer_modes.test.ts` for `verb was/were diagnosis training follows the MVP content contract`
- full `trainer_modes.test.ts`

Result:
- PASS after local verification.
