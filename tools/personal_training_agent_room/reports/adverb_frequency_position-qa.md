# adverb_frequency_position QA

QA status: PASS

## Checks

- Stable id: `adverb_frequency_position`
- Category: `adverb`
- Status: `active`
- Priority: `15`
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

- `freq_easy_001` wrong `drink always` feedback contains `always drink`.
- `freq_contrast_001` wrong `always is` feedback contains `is always`.
- `freq_mixed_003` wrong `doesn't never` feedback contains `двойное`.

## Notes

Learner-facing RU/UK copy avoids raw internal labels and teaches through ready chunks.
