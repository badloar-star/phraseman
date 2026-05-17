# there_is_are QA

QA status: PASS

## Manual Checklist

- [x] File has Jesse marker.
- [x] Status is `active`.
- [x] Taxonomy entry added as `active` / `PASS`.
- [x] Contract anchors preserved.
- [x] Every wrong option has distractor-specific feedback.
- [x] RU/UK learner-facing copy avoids raw internal grammar labels.
- [x] Smart Trainer config still points to `there_is_are`.
- [x] Admin sync run: `npm run training:personal:sync-admin` -> 46 Jesse reworked / 10 legacy need rework.
- [x] Personal training check run: `npm run training:personal:check` -> 5 suites / 15 tests passed.
- [x] Targeted trainer contract run: there is/there are contract -> 1 passed / 163 skipped.
- [x] Full trainer modes run: `tests/trainer_modes.test.ts` -> 164 passed.

## Notes

Rebuilt around the user-visible choice between `there is`, `there are`, question order, and negative forms. The lesson now explains existence/location separately from `have`.
