# too_enough QA

QA status: PASS

## Checks

- Stable id: `too_enough`
- Category: `modifier`
- Status: `active`
- Priority: `34`
- Supported locales: `ru`, `uk`
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

- `too_enough_easy_001` wrong `enough` feedback contains `too hot`.
- `too_enough_contrast_001` wrong `enough good` feedback contains `good enough`.
- `too_enough_contrast_004` wrong `time enough` feedback contains `enough time`.
- `too_enough_mixed_001` wrong `too much` feedback contains `too many people`.
- `too_enough_mixed_006` wrong long sentence feedback contains `too small / enough chairs`.

## Notes

Learner-facing RU/UK copy avoids internal grammar labels and keeps the lesson chunk-based.
