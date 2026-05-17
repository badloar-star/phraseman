# modal_may_might_probability QA

QA status: PASS

## Checks

- Stable id: `modal_may_might_probability`
- Category: `modal`
- Status: `active`
- Priority: `48`
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

- `modal_may_might_easy_001` wrong `can` feedback contains `may rain`.
- `modal_may_might_contrast_004` wrong `knows` feedback contains `may know`.
- `modal_may_might_mixed_002` wrong `doesn't might` feedback contains `might not work`.
- `modal_may_might_mixed_003` wrong `She maybe come.` feedback contains `She might come`.

## Notes

The rewrite keeps one narrow lesson: probability and uncertainty with `may/might`, separated from ability (`can`) and certainty (`will`).
