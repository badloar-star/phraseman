# modal_should_must_have_to QA

QA status: PASS

## Checks

- Stable id: `modal_should_must_have_to`
- Category: `modal`
- Status: `active`
- Priority: `46`
- Supported locales: `ru`, `uk`
- Training contrast set matches the MVP contract.
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

- `modal_smh_easy_001` wrong `must` feedback contains `should`.
- `modal_smh_easy_002` wrong `to call` feedback contains `should call`.
- `modal_smh_contrast_003` wrong `don't have to` feedback contains `mustn't`.
- `modal_smh_contrast_006` wrong `Have` feedback contains `Do you have to work`.

## Notes

The training now teaches meaning first: advice vs rule vs external necessity vs prohibition vs no obligation. This keeps the lesson narrow and avoids merging it with the broader legacy `modal_force` file.
