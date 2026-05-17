# adjective_vs_adverb QA

QA status: PASS

## Checks

- Stable id: `adjective_vs_adverb`
- Category: `adverb`
- Status: `active`
- Priority: `14`
- Supported locales: `ru`, `uk`, `es`
- Contrast set matches the MVP contract.
- Smart trainer contrast set matches the MVP contract.
- Examples: 8
- Steps: 15
- Guided mode: enabled
- Distractor-specific feedback: present for every wrong answer.
- Mastery rules include:
  - `minCorrect: 10`
  - `minCorrectStreak: 4`
  - `requireCorrectAfterWrong: true`
  - `requireMixedReview: true`
  - `unlockSmartTrainerAfterMastery: true`

## Contract anchors

- `adj_adv_easy_001` wrong `well` feedback contains `good`.
- `adj_adv_contrast_005` wrong `careful` feedback contains `carefully`.
- `adj_adv_mixed_001` wrong `strangely` feedback contains `strange`.

## Notes

The learner-facing copy teaches through phrase pairs instead of raw grammar labels.
