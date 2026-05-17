# reported_speech_basic QA

QA status: PASS

## Manual Checklist

- [x] File has Jesse marker.
- [x] Status is `active`.
- [x] Taxonomy entry added as `active` / `PASS`.
- [x] MVP contract ids and contrast sets preserved.
- [x] Learner-facing RU/UK copy avoids raw internal grammar labels.
- [x] Every wrong option has distractor-specific feedback.
- [x] Smart Trainer config still points to `reported_speech_basic`.
- [x] Admin sync run: `55 Jesse reworked`, `1 legacy need rework`.
- [x] Personal training check run: 5 suites / 15 passed.
- [x] Targeted MVP contract run: 1 passed / 163 skipped.
- [x] Full trainer modes run: 164 passed.

## Notes

Rebuilt around practical retelling: do not keep the quote shape. Contract-only labels such as `pronoun shift` and `reported question` are kept in contrast arrays because the tests assert them and they are not learner-facing copy.
