# noun_singular_plural_basic QA

QA status: PASS

## Manual Checklist

- [x] File has Jesse marker.
- [x] Status is `active`.
- [x] Taxonomy entry added as `active` / `PASS`.
- [x] Contract anchors preserved.
- [x] Every wrong option has distractor-specific feedback.
- [x] RU/UK learner-facing copy avoids raw internal grammar labels.
- [x] Smart Trainer config still points to `noun_singular_plural_basic`.
- [x] Admin sync run: `npm run training:personal:sync-admin` -> 47 Jesse reworked / 9 legacy need rework.
- [x] Personal training check run: `npm run training:personal:check` -> 5 suites / 15 tests passed.
- [x] Targeted trainer contract run: singular/plural noun contract -> 1 passed / 163 skipped.
- [x] Full trainer modes run: `tests/trainer_modes.test.ts` -> 164 passed.

## Notes

Rebuilt around the user-visible signal system: `a/this` for one item, `two/many/these` for several, and `information` as a no-`-s` case.
