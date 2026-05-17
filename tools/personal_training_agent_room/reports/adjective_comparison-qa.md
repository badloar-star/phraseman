# adjective_comparison QA

QA status: PASS

## Checks

- Stable id: `adjective_comparison`
- Category: `adjective`
- Status: `active`
- Priority: `13`
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

- `comparison_contrast_001` wrong `biger` feedback contains `bigger`.
- `comparison_easy_003` wrong `expensiver` feedback contains `more expensive`.
- `comparison_mixed_003` wrong `better / than` feedback contains `as good as`.

## Notes

The rewrite keeps one narrow lesson: comparison chunks, not a broad adjective lesson.
