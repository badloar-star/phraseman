# modal_can_could_ability_request QA

QA status: PASS

## Checks

- Stable id: `modal_can_could_ability_request`
- Category: `modal`
- Status: `active`
- Priority: `47`
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

- `modal_can_could_easy_001` wrong `could` feedback contains `can`.
- `modal_can_could_contrast_002` wrong `to help` feedback contains `could help`.
- `modal_can_could_contrast_004` wrong `can` feedback contains `could`.
- `modal_can_could_contrast_005` wrong `can't` feedback contains `couldn't`.

## Notes

The rewrite keeps one narrow lesson: time and tone with `can/could`, plus the short action form after the modal.
