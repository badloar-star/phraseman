# phrasal_particle_pair QA

QA status: PASS

## Manual Checklist

- [x] File has Jesse marker.
- [x] Status is `active`.
- [x] Taxonomy entry added as `active` / `PASS`.
- [x] Mojibake removed from training file.
- [x] Every wrong option has distractor-specific feedback.
- [x] Learner-facing copy avoids raw internal grammar labels.
- [x] Smart Trainer config still points to `phrasal_particle_pair`.
- [x] Admin sync run: `53 Jesse reworked`, `3 legacy need rework`.
- [x] Personal training check run: 5 suites / 15 passed.
- [x] Full trainer modes run: 164 passed.

## Notes

Rebuilt around whole-pair meaning: `turn on` is not trained as `turn` plus a random second part. This id has no dedicated MVP contract block in `trainer_modes.test.ts`, so QA uses room/hygiene/admin tests plus the full trainer modes suite.
